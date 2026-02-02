import { useParams } from 'react-router-dom';

/**
 * Recipe Editor - Create or edit recipes
 * 
 * Manual entry with all recipe fields.
 * Requirements: 25.1, 25.2, 25.3, 25.4
 */
export default function RecipeEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">
        {isNew ? 'New Recipe' : 'Edit Recipe'}
      </h1>
      {!isNew && (
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          Recipe ID: {id}
        </p>
      )}
      <p className="text-gray-600 dark:text-gray-400">
        Recipe editor coming soon!
      </p>
    </div>
  );
}
