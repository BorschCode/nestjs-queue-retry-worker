export const QUEUE_CONFIG = {
  QUEUE_NAME: 'message-delivery',
  DEAD_LETTER_QUEUE_NAME: 'message-delivery-dead-letter',
  MAX_RETRY_ATTEMPTS: 5,
  BACKOFF: {
    type: 'exponential' as const,
    delay: 1000, // Initial delay in ms
  },
};

export const getBackoffDelay = (attemptCount: number): number => {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s
  return QUEUE_CONFIG.BACKOFF.delay * Math.pow(2, attemptCount - 1);
};
