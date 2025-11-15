import { useState, useEffect } from 'react';
import Papa from 'papaparse';

export function useQuestions() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/data/questions.csv')
      .then(response => response.text())
      .then(csvText => {
        const result = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true
        });

        const parsed = result.data.map((r, idx) => ({
          __id: idx,
          Level: String(r.Level || '').trim(),
          Sentence: String(r.Sentence || '').trim(),
          options: [
            String(r['Option A'] || '').trim(),
            String(r['Option B'] || '').trim(),
            String(r['Option C'] || '').trim(),
            String(r['Option D'] || '').trim()
          ],
          Correct: String(r.Correct || '').trim()
        }));

        setQuestions(parsed);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, []);

  return { questions, loading, error };
}
