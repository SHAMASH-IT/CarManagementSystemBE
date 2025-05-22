import { Injectable, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as nodemailer from 'nodemailer';
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService
  ) {}

  async signup(name: string, email: string, password: string, phone: string , matf:string) {
    const hash = await bcrypt.hash(password, 10);
    try {
      const user = await this.prisma.user.create({
        data: {
          name,
          email,
          phone,
          hash,
          matf,
        },
      });
      return this.signToken(user.id, user.email, user.role);
    } catch (err) {
      throw new ForbiddenException('Email ou telephone déjà utilisé');
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
   async forgotPassword(email: string) {
  const user = await this.prisma.user.findUnique({ where: { email } });
  if (!user) throw new ForbiddenException('Utilisateur non trouvé');

  const token = await this.jwt.signAsync(
    { email },
    { secret: process.env.JWT_SECRET, expiresIn: '1h' }
  );

  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Utilisez un "App Password" ici
    },
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Réinitialisation de mot de passe',
      html: `
        <h3>Réinitialisation de mot de passe</h3>
        <p>Bonjour ${user.name},</p>
        <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>
        <a href="${resetLink}">Réinitialiser mon mot de passe</a>
        <p>Ce lien est valable pendant 1 heure.</p>
      `,
    });
    return { token ,message: 'E-mail de réinitialisation envoyé' };
  } catch (error) {
    throw new ForbiddenException("Échec de l'envoi de l'email");
  }
  }

  // 🔑 Fonction pour réinitialiser le mot de passe
  async resetPassword(token: string, newPassword: string) {
    try {
      const { email } = await this.jwt.verifyAsync(token, { secret: process.env.JWT_SECRET });

      const hash = await bcrypt.hash(newPassword, 10);

      await this.prisma.user.update({
        where: { email },
        data: { hash },
      });

      return { message: 'Mot de passe réinitialisé avec succès' };
    } catch (err) {
      throw new ForbiddenException('Lien de réinitialisation invalide ou expiré');
    }
  }
}
