import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { OtpService } from './otp.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { BillingModule } from '../billing/billing.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('auth.jwtSecret'),
        signOptions: { expiresIn: config.get<string>('auth.jwtExpiresIn') },
      }),
      inject: [ConfigService],
    }),
    BillingModule,
    TenantsModule,
  ],
  providers: [AuthService, OtpService, JwtStrategy, GoogleStrategy],
  controllers: [AuthController],
  exports: [AuthService, OtpService, JwtModule, PassportModule],
})
export class AuthModule {}
