import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
@Module({
  imports: [
        // Module JWT pour la gestion des tokens
    PassportModule,
    JwtModule.register({
      secret:  'mySecret', 
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController ],
  providers: [AuthService, JwtStrategy],
  exports: [JwtStrategy],
})
export class AuthModule {}
