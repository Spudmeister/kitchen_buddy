import { useParams } from 'react-router-dom';

/**
 * Recipe History - Version history for a recipe
 * 
 * View and restore previous versions.
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
export default function RecipeHistory() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Recipe History</h1>
      <p className="text-gray-600 dark:text-gray-400">
        Recipe ID: {id}
      </p>
      <p className="text-gray-600 dark:text-gray-400">
        Version history coming soon!
      </p>
    </div>
  );
}
