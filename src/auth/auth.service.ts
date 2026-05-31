import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import * as bcrypt from 'bcrypt'
import { RegisterDto } from "./dto/register.dto";
import { PrismaService } from "../prisma/prisma.service";
import * as crypto from "crypto";
import Redis from "ioredis";
import { VerifyOtpDto } from "./dto/verify-otp.dto";

@Injectable()
export class AuthService {

  constructor(
    private prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async register(dto: RegisterDto){
    const existingUser= await this.prisma.user.findUnique({
      where: {email: dto.email},
    });

    if(existingUser){
      throw new BadRequestException('Email already register')
    }

    const saltRound = 10;
    const hashPassword = await bcrypt.hash(dto.password, saltRound);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: hashPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: 'USER'
      }
    });

    const otp = Math.floor(1000 + Math.random() * 900000).toString();

    const hashOtp = crypto.createHash('sha256').update(otp).digest('hex');

    const redisKey = `otp:user:${user.id}`;
    await this.redis.set(redisKey,hashOtp, 'EX',300);

    console.log(`[PRODUCTION LOG] OTP for User ${user.email}: ${otp}`);

    return {
      message: "Registration successful. Please verify your OTP.",
      userId: user.id,
    };

  }

  async verifyOtp(dto: VerifyOtpDto) {
    const redisKey = `otp:user:${dto.userId}`;

    const storeHashOtp = await this.redis.get(redisKey);

    if(!storeHashOtp){
       throw new BadRequestException("OTP has expired or invalid user ID")
    }

    const clientHashOtp = crypto.createHash('sha256').update(dto.otp).digest('hex');

    if (storeHashOtp !== clientHashOtp){
      throw new BadRequestException('Invalid OTP code')
    }

    await this.prisma.user.update({
      where: {id: dto.userId},
      data: {isVerified: true}
    });

    await this.redis.del(redisKey);

    return {
      success: true,
      message: 'Account successfully verified. You can now log in'
    }
  }

}

























