import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AnalysisType } from '../../../common/enums/finance.enums';

@Entity('ai_analyses')
export class AiAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: AnalysisType })
  type: AnalysisType;

  @Column()
  period: string;

  @Column({ type: 'jsonb' })
  result: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
