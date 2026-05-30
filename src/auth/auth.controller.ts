import {
  Body,
  Controller,
  Post,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { RegisterDto } from "./dto/register.dto";
import { AuthService } from "./auth.service";

@Controller()
export class AuthController{

  constructor(private readonly authService:AuthService) {
  }
  
  @Post('register')
  @UsePipes(new ValidationPipe({whitelist: true}))
  async register(@Body() dto: RegisterDto){
    return this.authService.register(dto)
  }
}