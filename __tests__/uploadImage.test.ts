import { uploadImage } from '../utils/uploadImage';

// Mock the global fetch function
global.fetch = jest.fn();

describe('uploadImage dual-sync logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return ImgBB URL if both uploads succeed', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { display_url: 'https://imgbb.com/success.jpg' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { display_url: 'https://freeimage.host/success.jpg' } }),
      });

    const result = await uploadImage('file://path/to/image.jpg');
    expect(result).toBe('https://imgbb.com/success.jpg');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should return Freeimage.host URL if ImgBB fails but Freeimage.host succeeds', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: { message: 'ImgBB rate limit' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { display_url: 'https://freeimage.host/backup-success.jpg' } }),
      });

    const result = await uploadImage('file://path/to/image.jpg');
    expect(result).toBe('https://freeimage.host/backup-success.jpg');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should return ImgBB URL if ImgBB succeeds but Freeimage.host fails', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { display_url: 'https://imgbb.com/primary-success.jpg' } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: { message: 'Freeimage server error' } }),
      });

    const result = await uploadImage('file://path/to/image.jpg');
    expect(result).toBe('https://imgbb.com/primary-success.jpg');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should throw an error if both uploads fail', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: { message: 'ImgBB error' } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: { message: 'Freeimage error' } }),
      });

    await expect(uploadImage('file://path/to/image.jpg')).rejects.toThrow('Both image clouds failed.');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
