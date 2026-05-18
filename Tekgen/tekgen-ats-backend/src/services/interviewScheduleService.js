const crypto = require('crypto');
const prisma = require('../config/database');
const logger = require('../utils/logger');
const {
  getOutlookTransporter,
  getTeamsWebhookUrl,
  getWhatsAppCredentials,
  sendWhatsAppText,
} = require('./integrationResolveService');

function combineLocalDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const d = new Date(`${dateStr}T${timeStr}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function icsUtc(dt) {
  return dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeIcsText(s) {
  if (!s) return '';
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function buildInterviewIcs({
  uid,
  start,
  end,
  summary,
  description,
  location,
  organizerEmail,
  attendeeEmail,
  attendeeName,
  meetLink,
}) {
  const loc = location || (meetLink ? `Online: ${meetLink}` : '');
  const descParts = [description, meetLink ? `Join: ${meetLink}` : ''].filter(Boolean);
  const desc = escapeIcsText(descParts.join('\\n'));

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tekgen//ATS//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${icsUtc(new Date())}`,
    `DTSTART:${icsUtc(start)}`,
    `DTEND:${icsUtc(end)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${desc}`,
    loc ? `LOCATION:${escapeIcsText(loc)}` : '',
    organizerEmail ? `ORGANIZER;CN=Tekgen:mailto:${organizerEmail}` : '',
    attendeeEmail
      ? `ATTENDEE;CN=${escapeIcsText(attendeeName || 'Candidate')};RSVP=TRUE:mailto:${attendeeEmail}`
      : '',
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

async function sendTeamsInterviewCard(webhookUrl, payload) {
  const lines = [
    'Interview scheduled (Tekgen ATS)',
    `Candidate: ${payload.candidateName}`,
    `Role: ${payload.jobTitle || '—'}`,
    `When: ${payload.when}`,
    `Type: ${payload.interviewType || '—'}`,
    payload.locationOrLink ? `Location / link: ${payload.locationOrLink}` : null,
    payload.notes ? `Notes: ${payload.notes}` : null,
  ].filter(Boolean);
  const resp = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: lines.join('\n') }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Teams webhook failed (${resp.status}): ${t.slice(0, 200)}`);
  }
}

function mapRowToApi(row) {
  return {
    id: row.id,
    candidateEmail: row.candidateEmail,
    candidateName: row.candidateName,
    candidateId: row.candidateId,
    jobTitle: row.jobTitle,
    interviewDate: row.interviewDate,
    time: row.interviewTime,
    interviewTime: row.interviewTime,
    interviewType: row.type,
    type: row.type,
    location: row.location,
    meetLink: row.meetLink,
    zoomLink: row.zoomLink,
    notes: row.notes,
    status: row.status,
    icsSentAt: row.icsSentAt,
    teamsNotifiedAt: row.teamsNotifiedAt,
    whatsappNotifiedAt: row.whatsappNotifiedAt,
    durationMinutes: row.durationMinutes,
    createdAt: row.createdAt,
  };
}

class InterviewScheduleService {
  async list({ candidateId } = {}) {
    const where = {};
    if (candidateId) where.candidateId = candidateId;
    const rows = await prisma.interviewSchedule.findMany({
      where,
      orderBy: { interviewDate: 'asc' },
      take: 500,
    });
    return rows.map(mapRowToApi);
  }

  async delete(id) {
    try {
      await prisma.interviewSchedule.delete({ where: { id } });
    } catch (e) {
      if (e.code === 'P2025') throw new Error('Interview not found');
      throw e;
    }
  }

  /**
   * Full schedule flow used by Interviews UI + analytics API.
   */
  async scheduleFromForm(body, userId) {
    const {
      candidateEmail,
      candidateName,
      candidateId,
      jobTitle,
      interviewDate,
      time,
      interviewType,
      location,
      meetLink,
      notes,
      sendCalendarInvite = true,
      notifyTeamsChannel = true,
      sendWhatsApp: sendWa = false,
      durationMinutes = 60,
    } = body;

    if (!candidateEmail || !candidateName) {
      throw new Error('Candidate email and name are required');
    }
    if (!interviewDate || !time) {
      throw new Error('Interview date and time are required');
    }

    const start = combineLocalDateTime(interviewDate, time);
    if (!start) throw new Error('Invalid date or time');
    const end = new Date(start.getTime() + (Number(durationMinutes) || 60) * 60 * 1000);
    const role = (jobTitle && String(jobTitle).trim()) || 'Interview discussion';
    const type = interviewType || 'video';
    const calendarUid = `${crypto.randomUUID()}@tekgen-ats`;

    const row = await prisma.interviewSchedule.create({
      data: {
        candidateEmail: String(candidateEmail).toLowerCase().trim(),
        candidateName: String(candidateName).trim(),
        candidateId: candidateId || null,
        jobTitle: role,
        interviewDate: start,
        interviewTime: time,
        interviewerName: null,
        type,
        meetLink: meetLink || null,
        zoomLink: null,
        location: location || null,
        notes: notes || null,
        status: 'scheduled',
        scheduledById: userId,
        durationMinutes: Number(durationMinutes) || 60,
        calendarUid,
      },
    });

    const result = {
      schedule: mapRowToApi(row),
      integrations: {
        calendarInviteSent: false,
        teamsNotified: false,
        whatsappSent: false,
        warnings: [],
      },
    };

    const whenLabel = `${interviewDate} ${time}`;
    const locationOrLink = meetLink || location || '';

    if (sendCalendarInvite) {
      const outlook = await getOutlookTransporter(userId);
      if (!outlook) {
        result.integrations.warnings.push('Outlook SMTP not configured — calendar .ics not sent.');
      } else {
        try {
          const ics = buildInterviewIcs({
            uid: calendarUid,
            start,
            end,
            summary: `Interview: ${role} — ${candidateName}`,
            description: notes || `Interview with ${candidateName} for ${role}.`,
            location: location || '',
            organizerEmail: outlook.from,
            attendeeEmail: row.candidateEmail,
            attendeeName: row.candidateName,
            meetLink: meetLink || '',
          });

          await outlook.transporter.sendMail({
            from: outlook.from,
            to: row.candidateEmail,
            subject: `Interview invitation — ${role}`,
            text: `You have been invited to an interview on ${whenLabel}. Open the attached calendar file to add it to your calendar.`,
            html: `<p>Hello ${candidateName},</p><p>Your interview is scheduled for <strong>${whenLabel}</strong>.</p><p>Please open the attached <strong>invite.ics</strong> file to add it to Outlook or other calendars.</p>${meetLink ? `<p><a href="${meetLink}">Meeting link</a></p>` : ''}`,
            attachments: [
              {
                filename: 'invite.ics',
                content: ics,
                contentType: 'text/calendar; charset=utf-8; method=REQUEST',
              },
            ],
          });

          await prisma.interviewSchedule.update({
            where: { id: row.id },
            data: { icsSentAt: new Date() },
          });
          result.integrations.calendarInviteSent = true;
          result.schedule.icsSentAt = new Date();
        } catch (e) {
          logger.error('Interview ICS send failed', e);
          result.integrations.warnings.push(`Calendar invite failed: ${e.message}`);
        }
      }
    }

    if (notifyTeamsChannel) {
      const hook = await getTeamsWebhookUrl(userId);
      if (!hook) {
        result.integrations.warnings.push('Teams channel webhook not configured — skipped Teams post.');
      } else {
        try {
          await sendTeamsInterviewCard(hook, {
            candidateName: row.candidateName,
            jobTitle: role,
            when: whenLabel,
            interviewType: type,
            locationOrLink,
            notes: notes || '',
          });
          await prisma.interviewSchedule.update({
            where: { id: row.id },
            data: { teamsNotifiedAt: new Date() },
          });
          result.integrations.teamsNotified = true;
          result.schedule.teamsNotifiedAt = new Date();
        } catch (e) {
          logger.error('Teams interview notify failed', e);
          result.integrations.warnings.push(`Teams notification failed: ${e.message}`);
        }
      }
    }

    if (sendWa) {
      const wa = await getWhatsAppCredentials(userId);
      if (!wa) {
        result.integrations.warnings.push('WhatsApp Cloud API not configured — skipped WhatsApp.');
      } else {
        const cand = candidateId
          ? await prisma.candidate.findUnique({ where: { id: candidateId }, select: { phone: true } })
          : null;
        const phone = cand?.phone;
        if (!phone) {
          result.integrations.warnings.push('Candidate has no phone on file — WhatsApp skipped.');
        } else {
          try {
            const msg = [
              `Hello ${candidateName.split(' ')[0]},`,
              `Your interview for ${role} is scheduled on ${whenLabel}.`,
              locationOrLink ? `Details: ${locationOrLink}` : '',
              meetLink ? `Join: ${meetLink}` : '',
              '',
              '— Tekgen Recruitment',
            ]
              .filter(Boolean)
              .join('\n');
            await sendWhatsAppText({
              accessToken: wa.accessToken,
              phoneNumberId: wa.phoneNumberId,
              to: phone,
              body: msg,
            });
            await prisma.interviewSchedule.update({
              where: { id: row.id },
              data: { whatsappNotifiedAt: new Date() },
            });
            result.integrations.whatsappSent = true;
            result.schedule.whatsappNotifiedAt = new Date();
          } catch (e) {
            logger.error('WhatsApp interview notify failed', e);
            result.integrations.warnings.push(`WhatsApp failed: ${e.message}`);
          }
        }
      }
    }

    const fresh = await prisma.interviewSchedule.findUnique({ where: { id: row.id } });
    result.schedule = mapRowToApi(fresh);
    return result;
  }
}

module.exports = new InterviewScheduleService();
