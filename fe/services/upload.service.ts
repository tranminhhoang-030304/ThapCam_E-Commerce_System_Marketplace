import { nestApi } from '@/lib/axiosClient';

export class UploadService {
  /**
   * Đẩy file ảnh lên server và nhận về URL Cloudinary
   */
  static async uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await nestApi.post<any>('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.url;
  }
}