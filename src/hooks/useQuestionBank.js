import { useCallback, useEffect, useState } from 'react';
import { loadQuestionBank } from '../data/questions';

export function useQuestionBank() {
  const [bank, setBank] = useState(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    loadQuestionBank()
      .then(setBank)
      .catch(() => setError(true));
  }, []);

  useEffect(load, [load]);

  return { bank, error, retry: load };
}
