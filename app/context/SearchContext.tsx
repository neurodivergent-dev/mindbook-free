// This context is used to manage the search functionality in the application.
// It provides a way to show/hide the search bar and manage the search query state.
// It uses React's Context API to provide these values to the components that need them.
// The context is created with default values and can be used in any component that is a child of the SearchProvider.
// The useSearch hook is a custom hook that allows components to access the context values easily.
// It throws an error if used outside of the SearchProvider, ensuring that the context is always available when needed.
import { createContext, Dispatch, SetStateAction, useContext, useState } from 'react';

interface SearchContextType {
  showSearch: boolean;
  setShowSearch: Dispatch<SetStateAction<boolean>>;
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
}

export const SearchContext = createContext<SearchContextType>({
  showSearch: false,
  setShowSearch: () => {}, // TypeScript now knows this should accept a boolean parameter
  searchQuery: '',
  setSearchQuery: () => {}, // TypeScript now knows this should accept a string parameter
});

function SearchProvider({ children }) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <SearchContext.Provider
      value={{
        showSearch,
        setShowSearch,
        searchQuery,
        setSearchQuery,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}

export { SearchProvider, useSearch };
export default SearchProvider;
