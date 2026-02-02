import { useParams } from 'react-router-dom';

/**
 * Year in Review - Annual cooking summary
 * 
 * Shareable year-end cooking summary.
 * Requirements: 29.1, 29.2, 29.3
 */
export default function YearInReview() {
  const { year } = useParams<{ year: string }>();

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Year in Review - {year}</h1>
      <p className="text-gray-600 dark:text-gray-400">
        Your {year} cooking summary. Coming soon!
      </p>
    </div>
  );
}
