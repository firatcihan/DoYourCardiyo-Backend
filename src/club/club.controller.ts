import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClubService } from './club.service';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { ClerkAuthGuard } from '../common/auth/clerk-auth.guard';
import { AdminGuard } from '../common/auth/admin.guard';
import { UserId } from '../common/auth/user-id.decorator';

@Controller('clubs')
export class ClubController {
  constructor(private readonly clubService: ClubService) {}

  @Get()
  @UseGuards(ClerkAuthGuard)
  findAll() {
    return this.clubService.findAll();
  }

  @Post()
  @UseGuards(ClerkAuthGuard, AdminGuard)
  create(@Body() dto: CreateClubDto, @UserId() userId: string) {
    return this.clubService.create(dto, userId);
  }

  @Patch(':id')
  @UseGuards(ClerkAuthGuard, AdminGuard)
  update(@Param('id') id: string, @Body() dto: UpdateClubDto) {
    return this.clubService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ClerkAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.clubService.remove(id);
  }
}
