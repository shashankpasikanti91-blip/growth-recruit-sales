/**
 * Approval Service - Multi-level approval routing and workflow logic
 * Handles Leave, Claim, and Overtime approval hierarchies
 */

const prisma = require('../config/database');
const logger = require('../utils/logger');

/**
 * APPROVAL HIERARCHY
 * 
 * Leave, Claims & Overtime:
 *   Standard flow: Level 1 Department Manager -> Level 2 Executive (MD/Director/Management)
 *   If requester is already a department manager, request starts at executive level.
 */

class ApprovalService {
  /**
   * Roles that may act on pending rows where approverRole === MANAGING_DIRECTOR
   * (in addition to assignedTo). Client-first levels are never widened here.
   */
  getExecutiveChainRoles() {
    return new Set([
      'ADMIN',
      'MANAGEMENT',
      'ASSISTANT_MANAGER',
      'SUPER_ADMIN',
      'DIRECTOR',
      'HEAD',
      'MD',
      'MANAGING_DIRECTOR',
      'COMPANY_HEAD',
      'DEPT_HEAD',
      'DEPARTMENT_HEAD',
    ]);
  }

  isExecutiveChainRole(role) {
    return role && this.getExecutiveChainRoles().has(role);
  }

  normalizeEmail(email) {
    if (!email || typeof email !== 'string') return null;
    return email.trim().toLowerCase();
  }

  isDeployedStaff(employee) {
    if (!employee) return false;
    return employee.employmentType === 'DEPLOYED' || employee.staffType === 'DEPLOYED';
  }

  getPendingApprovalRecord(entity) {
    const list = entity?.approvals || [];
    return list.find((a) => a.status === 'PENDING') || null;
  }

  currentApprovalLevel(entity) {
    const pending = this.getPendingApprovalRecord(entity);
    return pending ? pending.approvalLevel : null;
  }

  finalApprovalLevel(entity) {
    const list = entity?.approvals || [];
    if (!list.length) return null;
    return Math.max(...list.map((a) => a.approvalLevel || 0));
  }

  /**
   * ID-first: optional approvalRowId must match the single pending row.
   */
  assertActorCanProcessApproval({ approval, userId, userRole, label = 'item' }) {
    if (!approval || approval.status !== 'PENDING') {
      throw new Error(`No pending ${label} approval to process`);
    }
    if (approval.assignedTo === userId) return;
    if (approval.approverRole === 'MANAGING_DIRECTOR' && this.isExecutiveChainRole(userRole)) return;
    throw new Error('Not authorized to act on this approval at the current level');
  }

  /**
   * Resolve the on-platform user who represents the client for deployed leave L1.
   * Order: explicit PaymentAgreement.clientLeaveApproverUserId → client primary email user
   * → HR / hiring client contacts → client owner user.
   */
  async resolveClientApproverUserForEmployee(employeeProfileId) {
    const agreement = await prisma.paymentAgreement.findFirst({
      where: {
        employeeId: employeeProfileId,
        status: 'ACTIVE',
        staffType: 'DEPLOYED',
        clientId: { not: null },
      },
      orderBy: { startDate: 'desc' },
      include: {
        clientLeaveApprover: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true },
        },
        client: {
          select: {
            id: true,
            primaryContactEmail: true,
            ownerId: true,
            contacts: {
              where: { status: 'ACTIVE' },
              select: { email: true, contactType: true },
            },
          },
        },
      },
    });

    if (!agreement?.clientId) return null;

    if (agreement.clientLeaveApproverUserId && agreement.clientLeaveApprover && agreement.clientLeaveApprover.isActive !== false) {
      return agreement.clientLeaveApprover;
    }

    const client = agreement.client;
    const ranked = [];
    if (client?.primaryContactEmail) {
      ranked.push({ email: client.primaryContactEmail, rank: 1 });
    }
    const typeRank = { HR: 2, HIRING_MANAGER: 3, FINANCE: 4, PROCUREMENT: 5, OTHER: 9 };
    (client?.contacts || []).forEach((c) => {
      if (c.email) ranked.push({ email: c.email, rank: typeRank[c.contactType] || 9 });
    });
    ranked.sort((a, b) => a.rank - b.rank);

    for (const { email } of ranked) {
      const norm = this.normalizeEmail(email);
      if (!norm) continue;
      const user = await prisma.user.findFirst({
        where: { email: { equals: norm, mode: 'insensitive' }, isActive: true },
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
      });
      if (user) return user;
    }

    if (client?.ownerId) {
      return prisma.user.findUnique({
        where: { id: client.ownerId },
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
      });
    }
    return null;
  }

  getManagerRoles() {
    return ['RECRUITMENT_MANAGER', 'SALES_MANAGER', 'HR_ADMIN', 'PAYROLL_ADMIN', 'FINANCE_HEAD', 'MANAGER', 'DEPT_MANAGER', 'DEPARTMENT_MANAGER'];
  }

  isDepartmentManagerRole(role) {
    return this.getManagerRoles().includes(role);
  }

  isExecutiveRole(role) {
    return ['MANAGEMENT', 'ASSISTANT_MANAGER', 'ADMIN', 'SUPER_ADMIN', 'MD', 'MANAGING_DIRECTOR', 'DIRECTOR', 'HEAD'].includes(role);
  }

  async findDepartmentManager(department, excludeUserId = null) {
    return prisma.user.findFirst({
      where: {
        role: {
          in: [
            'RECRUITMENT_MANAGER',
            'SALES_MANAGER',
            'HR_ADMIN',
            'PAYROLL_ADMIN',
            'FINANCE_HEAD',
            'MANAGER',
            'DEPT_MANAGER',
            'DEPARTMENT_MANAGER'
          ]
        },
        ...(department ? { department } : {}),
        ...(excludeUserId ? { id: { not: excludeUserId } } : {})
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true
      }
    });
  }

  async findAssistantManager(excludeUserId = null) {
    return prisma.user.findFirst({
      where: {
        role: { in: ['MANAGEMENT', 'ASSISTANT_MANAGER'] },
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true, firstName: true, lastName: true, email: true, role: true }
    });
  }

  async findManagingDirector(excludeUserId = null) {
    return prisma.user.findFirst({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN', 'MD', 'MANAGING_DIRECTOR'] },
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true, firstName: true, lastName: true, email: true, role: true }
    });
  }

  async findExecutiveApprover(excludeUserId = null) {
    // Prefer MD/Director first, then Management as fallback
    const mdOrDirector = await this.findManagingDirector(excludeUserId);
    if (mdOrDirector) return mdOrDirector;
    return this.findAssistantManager(excludeUserId);
  }

  /**
   * Determine the next approver for a leave request
   * @param {Object} leave - LeaveRequest with employee details
   * @param {Integer} currentLevel - Current approval level
   * @returns {Object} { nextApproverRole, nextLevel, nextApprover } or { approved: true }
   */
  async getNextLeaveApprover(leave, currentLevel = 0) {
    try {
      const employee = await prisma.employeeProfile.findUnique({
        where: { id: leave.employeeId },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
      });

      if (!employee) throw new Error('Employee not found');

      const department = employee.department;
      const requesterRole = employee.user?.role || 'EMPLOYEE';
      const isDepartmentManager = this.isDepartmentManagerRole(requesterRole);
      const isExecutiveRequester = this.isExecutiveRole(requesterRole);
      const isDeployed = this.isDeployedStaff(employee);

      // Determine next level
      let nextLevel = (currentLevel || 0) + 1;
      let nextApproverRole = null;
      let nextApprover = null;

      // Deployed / external staff: Client (L1) → Tekgen MD/Head (L2) — always before internal routing
      if (isDeployed) {
        if (nextLevel === 1) {
          nextApproverRole = 'CLIENT_APPROVER';
          nextApprover = await this.resolveClientApproverUserForEmployee(employee.id);
          if (!nextApprover) {
            throw new Error(
              'Client leave approver is not configured for this deployed staff member. Set PaymentAgreement.clientLeaveApproverUserId, or ensure a User exists for the client primary contact email / client owner.'
            );
          }
        } else if (nextLevel === 2) {
          nextApproverRole = 'MANAGING_DIRECTOR';
          nextApprover = await this.findExecutiveApprover(employee.user?.id);
        } else {
          throw new Error('Unexpected deployed leave approval level');
        }
      }
      // Executive requesters do not self-approve; route to another executive approver.
      else if (isExecutiveRequester && nextLevel === 1) {
        nextApproverRole = 'MANAGING_DIRECTOR';
        nextApprover = await this.findExecutiveApprover(employee.user?.id);
      }
      // Team members: L1 Department Manager
      else if (!isDepartmentManager && nextLevel === 1) {
        nextApproverRole = 'DEPARTMENT_MANAGER';
        nextApprover = await this.findDepartmentManager(department, employee.user?.id);
      }
      // L2 final executive approval (or L1 for manager-originated requests)
      else if ((isDepartmentManager && nextLevel === 1) || (!isDepartmentManager && nextLevel === 2)) {
        nextApproverRole = 'MANAGING_DIRECTOR';
        nextApprover = await this.findExecutiveApprover(employee.user?.id);
      }

      if (nextApprover) {
        return {
          nextLevel,
          nextApproverRole,
          nextApproverId: nextApprover.id,
          nextApprover: {
            name: `${nextApprover.firstName} ${nextApprover.lastName}`,
            email: nextApprover.email,
            role: nextApprover.role
          }
        };
      } else {
        // No more approvers, consider approved
        return { approved: true };
      }
    } catch (error) {
      logger.error('Error in getNextLeaveApprover:', error);
      throw error;
    }
  }

  /**
   * Determine the next approver for a claim request
   * @param {Object} claim - Claim with employee details
   * @param {Integer} currentLevel - Current approval level
   * @returns {Object} Approver info or { approved: true }
   */
  async getNextClaimApprover(claim, currentLevel = 0) {
    try {
      const employee = await prisma.employeeProfile.findUnique({
        where: { id: claim.employeeId },
        include: { user: true },
      });

      if (!employee) throw new Error('Employee not found');

      const department = employee.department;
      const requesterRole = employee.user?.role || 'EMPLOYEE';
      const isDepartmentManager = this.isDepartmentManagerRole(requesterRole);
      const isExecutiveRequester = this.isExecutiveRole(requesterRole);
      let nextLevel = (currentLevel || 0) + 1;
      let nextApproverRole = null;
      let nextApprover = null;

      if (isExecutiveRequester && nextLevel === 1) {
        nextApproverRole = 'MANAGING_DIRECTOR';
        nextApprover = await this.findExecutiveApprover(employee.user?.id);
      }
      else if (!isDepartmentManager && nextLevel === 1) {
        nextApproverRole = 'DEPARTMENT_MANAGER';
        nextApprover = await this.findDepartmentManager(department, employee.user?.id);
      }
      else if ((isDepartmentManager && nextLevel === 1) || (!isDepartmentManager && nextLevel === 2)) {
        nextApproverRole = 'MANAGING_DIRECTOR';
        nextApprover = await this.findExecutiveApprover(employee.user?.id);
      }

      if (nextApprover) {
        return {
          nextLevel,
          nextApproverRole,
          nextApproverId: nextApprover.id,
          nextApprover: {
            name: `${nextApprover.firstName} ${nextApprover.lastName}`,
            email: nextApprover.email,
            role: nextApprover.role
          }
        };
      } else {
        return { approved: true };
      }
    } catch (error) {
      logger.error('Error in getNextClaimApprover:', error);
      throw error;
    }
  }

  /**
   * Determine the next approver for an overtime claim
   * @param {Object} overtime - OvertimeClaim with employee details
   * @param {Integer} currentLevel - Current approval level
   * @returns {Object} Approver info or { approved: true }
   */
  async getNextOvertimeApprover(overtime, currentLevel = 0) {
    try {
      const employee = await prisma.employeeProfile.findUnique({
        where: { id: overtime.employeeId },
        include: { user: true },
      });

      if (!employee) throw new Error('Employee not found');

      const department = employee.department;
      const requesterRole = employee.user?.role || 'EMPLOYEE';
      const isDepartmentManager = this.isDepartmentManagerRole(requesterRole);
      const isExecutiveRequester = this.isExecutiveRole(requesterRole);
      let nextLevel = (currentLevel || 0) + 1;
      let nextApproverRole = null;
      let nextApprover = null;

      if (isExecutiveRequester && nextLevel === 1) {
        nextApproverRole = 'MANAGING_DIRECTOR';
        nextApprover = await this.findExecutiveApprover(employee.user?.id);
      }
      else if (!isDepartmentManager && nextLevel === 1) {
        nextApproverRole = 'DEPARTMENT_MANAGER';
        nextApprover = await this.findDepartmentManager(department, employee.user?.id);
      }
      else if ((isDepartmentManager && nextLevel === 1) || (!isDepartmentManager && nextLevel === 2)) {
        nextApproverRole = 'MANAGING_DIRECTOR';
        nextApprover = await this.findExecutiveApprover(employee.user?.id);
      }

      if (nextApprover) {
        return {
          nextLevel,
          nextApproverRole,
          nextApproverId: nextApprover.id,
          nextApprover: {
            name: `${nextApprover.firstName} ${nextApprover.lastName}`,
            email: nextApprover.email,
            role: nextApprover.role
          }
        };
      } else {
        return { approved: true };
      }
    } catch (error) {
      logger.error('Error in getNextOvertimeApprover:', error);
      throw error;
    }
  }

  /**
   * Process leave approval at a given level
   * @param {String} leaveId - Leave request ID
   * @param {String} userId - Approver user ID
   * @param {String} action - APPROVE or REJECT
   * @param {String} comments - Approval comments
   * @returns {Object} Updated leave request
   */
  async processLeaveApproval(leaveId, userId, action, comments = '', options = {}) {
    try {
      if (!['APPROVE', 'REJECT'].includes(action)) {
        throw new Error('Invalid action. Must be APPROVE or REJECT');
      }

      const { approvalId = null, userRole = null } = options;

      const leave = await prisma.leaveRequest.findUnique({
        where: { id: leaveId },
        include: {
          approvals: { orderBy: { approvalLevel: 'asc' } },
          employee: true
        }
      });

      if (!leave) throw new Error('Leave request not found');

      // Find current pending approval (ID-first when approvalId supplied)
      const currentApproval = leave.approvals.find(a => a.status === 'PENDING');
      if (!currentApproval) {
        throw new Error('No pending approval found for this leave request');
      }
      if (approvalId && currentApproval.id !== approvalId) {
        throw new Error('approvalId does not match the current pending leave approval');
      }

      this.assertActorCanProcessApproval({
        approval: currentApproval,
        userId,
        userRole,
        label: 'leave',
      });

      // Update the approval record
      const updatedApproval = await prisma.leaveApproval.update({
        where: { id: currentApproval.id },
        data: {
          status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          approvedBy: userId,
          approvedAt: new Date(),
          comments: comments || null
        }
      });

      let updatedLeave;

      if (action === 'REJECT') {
        // Rejection ends the workflow
        updatedLeave = await prisma.leaveRequest.update({
          where: { id: leaveId },
          data: {
            status: 'REJECTED',
            approvedBy: userId,
            approvedAt: new Date(),
            rejectionReason: comments
          }
        });
      } else {
        // Approval - check if all levels are approved
        const allApprovals = leave.approvals.map(a => 
          a.id === currentApproval.id ? updatedApproval : a
        );
        const allApproved = allApprovals.every(a => a.status === 'APPROVED');

        if (allApproved) {
          // All levels approved - set to APPROVED
          updatedLeave = await prisma.leaveRequest.update({
            where: { id: leaveId },
            data: {
              status: 'APPROVED',
              approvedBy: userId,
              approvedAt: new Date(),
              currentApprovalLevel: currentApproval.approvalLevel
            }
          });
        } else {
          // Move to next level
          const nextApprovalInfo = await this.getNextLeaveApprover(leave, currentApproval.approvalLevel);

          if (nextApprovalInfo.approved) {
            // No more approvers needed
            updatedLeave = await prisma.leaveRequest.update({
              where: { id: leaveId },
              data: {
                status: 'APPROVED',
                approvedBy: userId,
                approvedAt: new Date()
              }
            });
          } else {
            // Create next level approval
            await prisma.leaveApproval.create({
              data: {
                leaveRequestId: leaveId,
                approvalLevel: nextApprovalInfo.nextLevel,
                approverRole: nextApprovalInfo.nextApproverRole,
                assignedTo: nextApprovalInfo.nextApproverId,
                status: 'PENDING'
              }
            });

            updatedLeave = await prisma.leaveRequest.update({
              where: { id: leaveId },
              data: {
                status: 'PENDING_APPROVAL',
                currentApprovalLevel: nextApprovalInfo.nextLevel
              }
            });
          }
        }
      }

      return updatedLeave;
    } catch (error) {
      logger.error('Error in processLeaveApproval:', error);
      throw error;
    }
  }

  /**
   * Process claim approval at a given level
   * @param {String} claimId - Claim ID
   * @param {String} userId - Approver user ID
   * @param {String} action - APPROVE or REJECT
   * @param {String} comments - Approval comments
   * @returns {Object} Updated claim
   */
  async processClaimApproval(claimId, userId, action, comments = '', options = {}) {
    try {
      if (!['APPROVE', 'REJECT'].includes(action)) {
        throw new Error('Invalid action. Must be APPROVE or REJECT');
      }

      const { approvalId = null, userRole = null } = options;

      const claim = await prisma.claim.findUnique({
        where: { id: claimId },
        include: {
          approvals: { orderBy: { approvalLevel: 'asc' } },
          employee: true
        }
      });

      if (!claim) throw new Error('Claim not found');

      const currentApproval = claim.approvals.find(a => a.status === 'PENDING');
      if (!currentApproval) {
        throw new Error('No pending approval found for this claim');
      }
      if (approvalId && currentApproval.id !== approvalId) {
        throw new Error('approvalId does not match the current pending claim approval');
      }

      this.assertActorCanProcessApproval({
        approval: currentApproval,
        userId,
        userRole,
        label: 'claim',
      });

      const updatedApproval = await prisma.claimApproval.update({
        where: { id: currentApproval.id },
        data: {
          status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          approvedBy: userId,
          approvedAt: new Date(),
          comments: comments || null
        }
      });

      let updatedClaim;

      if (action === 'REJECT') {
        updatedClaim = await prisma.claim.update({
          where: { id: claimId },
          data: {
            status: 'REJECTED',
            reviewedBy: userId,
            reviewedAt: new Date(),
            rejectionReason: comments
          }
        });
      } else {
        const allApprovals = claim.approvals.map(a =>
          a.id === currentApproval.id ? updatedApproval : a
        );
        const allApproved = allApprovals.every(a => a.status === 'APPROVED');

        if (allApproved) {
          updatedClaim = await prisma.claim.update({
            where: { id: claimId },
            data: {
              status: 'APPROVED',
              reviewedBy: userId,
              reviewedAt: new Date(),
              currentApprovalLevel: currentApproval.approvalLevel
            }
          });
        } else {
          const nextApprovalInfo = await this.getNextClaimApprover(claim, currentApproval.approvalLevel);

          if (nextApprovalInfo.approved) {
            updatedClaim = await prisma.claim.update({
              where: { id: claimId },
              data: {
                status: 'APPROVED',
                reviewedBy: userId,
                reviewedAt: new Date()
              }
            });
          } else {
            await prisma.claimApproval.create({
              data: {
                claimId: claimId,
                approvalLevel: nextApprovalInfo.nextLevel,
                approverRole: nextApprovalInfo.nextApproverRole,
                assignedTo: nextApprovalInfo.nextApproverId,
                status: 'PENDING'
              }
            });

            updatedClaim = await prisma.claim.update({
              where: { id: claimId },
              data: {
                status: 'PENDING_APPROVAL',
                currentApprovalLevel: nextApprovalInfo.nextLevel
              }
            });
          }
        }
      }

      return updatedClaim;
    } catch (error) {
      logger.error('Error in processClaimApproval:', error);
      throw error;
    }
  }

  /**
   * Initialize approval chain for a new leave request
   * @param {String} leaveId - Leave request ID
   * @returns {Object} First approval record
   */
  async initializeLeaveApprovals(leaveId) {
    try {
      const leave = await prisma.leaveRequest.findUnique({
        where: { id: leaveId },
        include: { employee: true }
      });

      if (!leave) throw new Error('Leave request not found');

      // Get first approver
      const approverInfo = await this.getNextLeaveApprover(leave, 0);

      if (approverInfo.approved) {
        // Auto-approve if no approvers found
        await prisma.leaveRequest.update({
          where: { id: leaveId },
          data: { status: 'APPROVED', currentApprovalLevel: 1 }
        });
        return null;
      }

      // Create first level approval
      const approval = await prisma.leaveApproval.create({
        data: {
          leaveRequestId: leaveId,
          approvalLevel: 1,
          approverRole: approverInfo.nextApproverRole,
          assignedTo: approverInfo.nextApproverId,
          status: 'PENDING'
        }
      });

      await prisma.leaveRequest.update({
        where: { id: leaveId },
        data: { status: 'PENDING_APPROVAL', currentApprovalLevel: 1 }
      });

      return approval;
    } catch (error) {
      logger.error('Error in initializeLeaveApprovals:', error);
      throw error;
    }
  }

  /**
   * Initialize approval chain for a new claim
   * @param {String} claimId - Claim ID
   * @returns {Object} First approval record
   */
  async initializeClaimApprovals(claimId) {
    try {
      const claim = await prisma.claim.findUnique({
        where: { id: claimId },
        include: { employee: true }
      });

      if (!claim) throw new Error('Claim not found');

      const approverInfo = await this.getNextClaimApprover(claim, 0);

      if (approverInfo.approved) {
        await prisma.claim.update({
          where: { id: claimId },
          data: { status: 'APPROVED', currentApprovalLevel: 1 }
        });
        return null;
      }

      const approval = await prisma.claimApproval.create({
        data: {
          claimId: claimId,
          approvalLevel: 1,
          approverRole: approverInfo.nextApproverRole,
          assignedTo: approverInfo.nextApproverId,
          status: 'PENDING'
        }
      });

      await prisma.claim.update({
        where: { id: claimId },
        data: { status: 'PENDING_APPROVAL', currentApprovalLevel: 1 }
      });

      return approval;
    } catch (error) {
      logger.error('Error in initializeClaimApprovals:', error);
      throw error;
    }
  }

  /**
   * Get pending approvals for a user
   * @param {String} userId - User ID
   * @param {String} type - 'leaves', 'claims', 'overtime', or 'all'
   * @returns {Object} Pending items grouped by type
   */
  async getPendingApprovalsForUser(userId, type = 'all') {
    try {
      const result = {};

      if (type === 'leaves' || type === 'all') {
        result.leaves = await prisma.leaveApproval.findMany({
          where: {
            assignedTo: userId,
            status: 'PENDING'
          },
          include: {
            leaveRequest: {
              include: {
                employee: {
                  include: { user: { select: { firstName: true, lastName: true, email: true } } }
                },
                approvals: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
      }

      if (type === 'claims' || type === 'all') {
        result.claims = await prisma.claimApproval.findMany({
          where: {
            assignedTo: userId,
            status: 'PENDING'
          },
          include: {
            claim: {
              include: {
                employee: {
                  include: { user: { select: { firstName: true, lastName: true, email: true } } }
                },
                approvals: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
      }

      return result;
    } catch (error) {
      logger.error('Error in getPendingApprovalsForUser:', error);
      throw error;
    }
  }
}

module.exports = new ApprovalService();
