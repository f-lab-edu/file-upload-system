import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { FindIdSendDto } from './dto/find-id-send.dto';
import { FindIdVerifyDto } from './dto/find-id-verify.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateMeEmailSendDto } from './dto/update-me-email-send.dto';
import { UpdateMeEmailVerifyDto } from './dto/update-me-email-verify.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

type AuthedRequest = {
  user: { id: string; loginId: string; email: string; name: string | null };
};

@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('find-id/send-code')
  findIdSendCode(@Body() dto: FindIdSendDto) {
    return this.auth.findIdSendCode(dto);
  }

  @Post('find-id/verify')
  findIdVerify(@Body() dto: FindIdVerifyDto) {
    return this.auth.findIdVerify(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: AuthedRequest) {
    return req.user;
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@Req() req: AuthedRequest, @Body() dto: UpdateMeDto) {
    return this.auth.updateMe(req.user.id, dto);
  }

  @Post(['me-email-send-code', 'me/email/send-code'])
  @UseGuards(JwtAuthGuard)
  updateMeEmailSendCode(
    @Req() req: AuthedRequest,
    @Body() dto: UpdateMeEmailSendDto,
  ) {
    return this.auth.updateMeEmailSendCode(req.user.id, dto);
  }

  @Post(['me-email-verify-code', 'me/email/verify-code'])
  @UseGuards(JwtAuthGuard)
  updateMeEmailVerifyCode(
    @Req() req: AuthedRequest,
    @Body() dto: UpdateMeEmailVerifyDto,
  ) {
    return this.auth.updateMeEmailVerifyCode(req.user.id, dto);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  deleteMe(@Req() req: AuthedRequest) {
    return this.auth.deleteMe(req.user.id);
  }
}
