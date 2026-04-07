import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Club } from './schemas/club.schema';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';

@Injectable()
export class ClubService {
  constructor(
    @InjectModel(Club.name) private readonly clubModel: Model<Club>,
  ) {}

  async findAll(): Promise<Club[]> {
    return this.clubModel.find();
  }

  async create(dto: CreateClubDto, createdBy: string): Promise<Club> {
    try {
      return await this.clubModel.create({ ...dto, createdBy });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: number }).code === 11000
      ) {
        throw new ConflictException('Bu isimde bir kulüp zaten var.');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateClubDto): Promise<Club> {
    try {
      const club = await this.clubModel.findByIdAndUpdate(id, dto, {
        new: true,
      });
      if (!club) throw new NotFoundException('Kulüp bulunamadı.');
      return club;
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: number }).code === 11000
      ) {
        throw new ConflictException('Bu isimde bir kulüp zaten var.');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const result = await this.clubModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Kulüp bulunamadı.');
  }
}
