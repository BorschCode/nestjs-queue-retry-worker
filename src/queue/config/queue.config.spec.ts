import { getBackoffDelay, QUEUE_CONFIG } from './queue.config';

describe('Queue Configuration', () => {
  describe('QUEUE_CONFIG', () => {
    it('should have correct configuration values', () => {
      expect(QUEUE_CONFIG.QUEUE_NAME).toBe('message-delivery');
      expect(QUEUE_CONFIG.DEAD_LETTER_QUEUE_NAME).toBe(
        'message-delivery-dead-letter',
      );
      expect(QUEUE_CONFIG.MAX_RETRY_ATTEMPTS).toBe(5);
      expect(QUEUE_CONFIG.BACKOFF.type).toBe('exponential');
      expect(QUEUE_CONFIG.BACKOFF.delay).toBe(1000);
    });
  });

  describe('getBackoffDelay', () => {
    it('should calculate exponential backoff correctly', () => {
      // Attempt 1: 1000 * 2^0 = 1000ms (1s)
      expect(getBackoffDelay(1)).toBe(1000);

      // Attempt 2: 1000 * 2^1 = 2000ms (2s)
      expect(getBackoffDelay(2)).toBe(2000);

      // Attempt 3: 1000 * 2^2 = 4000ms (4s)
      expect(getBackoffDelay(3)).toBe(4000);

      // Attempt 4: 1000 * 2^3 = 8000ms (8s)
      expect(getBackoffDelay(4)).toBe(8000);

      // Attempt 5: 1000 * 2^4 = 16000ms (16s)
      expect(getBackoffDelay(5)).toBe(16000);
    });

    it('should handle edge cases', () => {
      // Attempt 0: Should not be called in practice, but should handle gracefully
      expect(getBackoffDelay(0)).toBe(500);

      // Large attempt number
      expect(getBackoffDelay(10)).toBe(512000); // 1000 * 2^9
    });
  });
});
