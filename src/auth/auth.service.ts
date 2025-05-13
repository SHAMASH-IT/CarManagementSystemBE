import { Injectable, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService
  ) {}

  // 1. Inscription d'un nouvel utilisateur
  async signup(name: string, email: string, password: string, phone: string) {
    const hash = await bcrypt.hash(password, 10); // Hash le mot de passe avec un "sel" de 10 rounds
    try {
      const user = await this.prisma.user.create({ // Crée l'utilisateur dans la base de données
        data: {
          name,
          email,
          phone,
          hash,
        },
      });
        // Retourne un token JWT
      return this.signToken(user.id, user.email, user.role, user.phone, user.name);
    } catch (err) {
      // Si l'email est déjà utilisé
      throw new ForbiddenException('Email déjà utilisé');
    }
  }
// 2. Connexion d'un utilisateur
  async signin(email: string, password: string) {
     // Cherche l'utilisateur par email
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new ForbiddenException('Email ou mot de passe invalide');

    // Compare le mot de passe fourni avec le hash stocké
    const pwMatches = await bcrypt.compare(password, user.hash);
    if (!pwMatches) throw new ForbiddenException('Email ou mot de passe invalide');

    // Retourne un token JWT
    return this.signToken(user.id, user.email, user.role, user.phone, user.name);
  }

   // 3. Génération du token JWT
  async signToken(userId: number, email: string, role: string , phone: string , name: string) {
     // Crée le payload du token (les données à encoder)
    const payload = { sub: userId, email, role };
    const token = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '1d', // Génère le token avec une expiration de 1 jour
    });

    return {
      access_token: token, //Retourne le token
      role: role,
      id: userId,
      name: name,
      email: email,
      phone: phone,

    };
  }
}
