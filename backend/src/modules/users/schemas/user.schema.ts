import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';
import { UserStatus, UserRole } from '../../../common/constants';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ type: String, required: false, index: true })
  organizationId?: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ type: String, default: null })
  avatarUrl?: string;

  @Prop({ type: String, default: null })
  phone?: string;

  @Prop({ type: String, default: null })
  location?: string;

  @Prop({ type: String, default: null })
  bio?: string;

  @Prop({
    type: String,
    enum: Object.values(UserStatus),
    default: UserStatus.ACTIVE,
    index: true,
  })
  status: UserStatus;

  @Prop({ type: [String], default: [UserRole.EMPLOYEE] })
  roles: string[];

  @Prop({ type: [String], default: [] })
  permissions: string[];

  /**
   * Departments this user's data visibility is restricted to (plus their
   * descendants). Empty means "no explicit restriction" — see
   * EmployeeScopeService for how an unset scope is resolved for Managers.
   */
  @Prop({ type: [String], default: [] })
  departmentScope: string[];

  @Prop({ default: 0 })
  failedLoginAttempts: number;

  @Prop({ type: Date, default: null })
  lockedUntil?: Date;

  @Prop({ type: Date, default: null })
  lastLoginAt?: Date;

  @Prop({ default: false, index: true })
  isDeleted: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});
