import mongoose, { Schema, Document } from 'mongoose';

export interface ISnapshot extends Document {
  requestId: string;
  environmentId?: string;
  label?: string;
  isBaseline: boolean;
  response: {
    status: number;
    statusText: string;
    data: any;
    headers: Record<string, string>;
    responseTime: number;
  };
  timestamp: number;
}

const SnapshotSchema = new Schema<ISnapshot>({
  requestId: { type: String, required: true, index: true },
  environmentId: { type: String, default: undefined },
  label: { type: String, default: undefined },
  isBaseline: { type: Boolean, default: false },
  response: {
    status: { type: Number, required: true },
    statusText: { type: String, default: '' },
    data: { type: Schema.Types.Mixed },
    headers: { type: Schema.Types.Mixed, default: {} },
    responseTime: { type: Number, required: true }
  },
  timestamp: { type: Number, required: true }
});

SnapshotSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model<ISnapshot>('Snapshot', SnapshotSchema);
