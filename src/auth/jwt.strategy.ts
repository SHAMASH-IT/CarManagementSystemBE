import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
       // Configuration de la stratégie JWT
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Extrait le token du header
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'mySecret', // Clé secrète pour vérifier le token
    });
  }

  async validate(payload: any) {
   
    return { userId: payload.sub};
  }
}
