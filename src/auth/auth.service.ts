import { Injectable, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService
  ) {}

  async signup(name: string, email: string, password: string, phone: string) {
    const hash = await bcrypt.hash(password, 10);
    try {
      const user = await this.prisma.user.create({
        data: {
          name,
          email,
          phone,
          hash,
        },
      });
      return this.signToken(user.id, user.email, user.role);
    } catch (err) {
      throw new ForbiddenException('Email déjà utilisé');
    }
  }

  async signin(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new ForbiddenException('Email ou mot de passe invalide');

    const pwMatches = await bcrypt.compare(password, user.hash);
    if (!pwMatches) throw new ForbiddenException('Email ou mot de passe invalide');

    return this.signToken(user.id, user.email, user.role);
  }

  async signToken(userId: number, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const token = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN,
    });

    return {
      access_token: token,
    };
  }
}
