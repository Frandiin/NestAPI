import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateJobDto, JobResponseDto } from './dto/create-job.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar e enfileirar uma nova tarefa em background' })
  @ApiResponse({ status: 201, type: JobResponseDto })
  async createJob(
    @Body() createJobDto: CreateJobDto,
    @CurrentUser('sub') userId: string,
  ): Promise<JobResponseDto> {
    return this.jobsService.addJob(createJobDto, userId);
  }
}
