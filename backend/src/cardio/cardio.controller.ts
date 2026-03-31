import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  MaxFileSizeValidator,
  FileTypeValidator,
  ParseFilePipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PreprocessingService } from './preprocessing.service';
import { GeminiService } from './gemini.service';
import { AnalyzeResponseDto } from './dto/analyze-response.dto';

@Controller('cardio')
export class CardioController {
  constructor(
    private readonly preprocessingService: PreprocessingService,
    private readonly geminiService: GeminiService,
  ) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async analyze(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /image\/(jpeg|jpg|png)/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<AnalyzeResponseDto> {
    const processedBuffer = await this.preprocessingService.process(file.buffer);
    return this.geminiService.analyze(processedBuffer);
  }
}
