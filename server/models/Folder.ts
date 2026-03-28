import mongoose, { Schema, Document } from 'mongoose';

export interface IFolder extends Document {
  name: string;
}

const FolderSchema = new Schema<IFolder>({
  name: { type: String, required: true }
}, { timestamps: true });

FolderSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model<IFolder>('Folder', FolderSchema);
