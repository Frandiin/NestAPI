import { CLOUDINARY } from '../../src/modules/files/cloudinary.provider';

export const mockCloudinary = {
  config: jest.fn(),
  uploader: {
    upload_stream: jest.fn().mockImplementation((_opts, callback) => {
      // Simula um stream que chama o callback com sucesso imediatamente
      const fakeResult = {
        public_id: 'mock_folder/mock_file_123',
        secure_url: 'https://res.cloudinary.com/demo/image/upload/v12345/mock_folder/mock_file_123.png',
        url: 'http://res.cloudinary.com/demo/image/upload/v12345/mock_folder/mock_file_123.png',
        original_filename: 'mock_file',
        format: 'png',
        bytes: 1234,
        width: 100,
        height: 100,
      };
      // Chama o callback assincronamente para simular upload
      process.nextTick(() => callback(null, fakeResult));

      // Retorna um stream dummy que aceita writes e não faz nada
      const { PassThrough } = require('stream');
      return new PassThrough();
    }),
  },
};

export const MockCloudinaryProvider = {
  provide: CLOUDINARY,
  useValue: mockCloudinary,
};
