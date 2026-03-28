import mongoose, { Schema, Document } from 'mongoose';

export interface IEnvironment extends Document {
  name: string;
  baseUrl: string;
  variables: Record<string, string>;
  color: string;
}

const EnvironmentSchema = new Schema<IEnvironment>({
  name: { type: String, required: true },
  baseUrl: { type: String, required: true },
  variables: { type: Schema.Types.Mixed, default: {} },
  color: { type: String, default: '#007bff' }
}, { timestamps: true });

EnvironmentSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model<IEnvironment>('Environment', EnvironmentSchema);
