# MindBook Pro - Architectural Documentation

## System Architecture

```mermaid
graph TB
    subgraph Frontend [Frontend Layer]
        UI[UI Components]
        Screens[Screens]
        Navigation[Navigation - Expo Router]
    end

    subgraph State [State Management]
        Redux[Redux Store]
        Context[Context API]
        LocalStorage[Async Storage]
    end

    subgraph Business [Business Layer]
        Services[Services]
        Hooks[Custom Hooks]
        Models[Data Models]
    end

    subgraph External [External Services]
        Auth[Authentication - Expo Auth]
        DB[Supabase]
        Push[Push Notifications]
    end

    UI --> Navigation
    Screens --> Navigation
    Navigation --> Redux
    Navigation --> Context
    Redux --> Services
    Context --> Services
    Services --> LocalStorage
    Services --> Models
    Services --> External
    Hooks --> Services
    Hooks --> Redux
    Models --> DB
```

## Layer Details

### 1. Frontend Layer

- **UI Components**: Reusable UI components
- **Screens**: SPage components
- **Navigation**: Expo Router v4 based routing system
  - (tabs): Main tab navigation
  - (modal): Modal screens
  - (auth): Authentication screens

### 2. State Management

- **Redux Store**: Global situation management
  - Notes slice
  - User slice
- **Context API**: Theme, Auth, and other contexts
- **Local Storage**: Offline data management with AsyncStorage

### 3. Business Layer

- **Services**:
  - Notifications service
  - Offline service
  - API service
- **Custom Hooks**: React hooks
- **Models**: Data models and type definitions

### 4. External Services

- **Authentication**: Expo Auth Session
- **Database**: Supabase
- **Push Notifications**: Expo Notifications

## Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as UI Layer
    participant S as State
    participant B as Business Layer
    participant E as External Services

    U->>UI: User Action
    UI->>S: Dispatch Action
    S->>B: Process Data
    B->>E: API Request
    E-->>B: Response
    B-->>S: Update State
    S-->>UI: Re-render
    UI-->>U: Updated View
```

## Security Architecture

```mermaid
graph LR
    subgraph Security [Security Layer]
        Auth[Authentication]
        Secure[Secure Store]
        Env[Environment Variables]
    end

    subgraph App [Application]
        Routes[Protected Routes]
        Data[Data Access]
        API[API Calls]
    end

    Auth --> Routes
    Secure --> Data
    Env --> API
    Routes --> Data
    Data --> API
```

## Performance Optimizations

```mermaid
graph TD
    subgraph Performance [Performance Optimizations]
        Lazy[Lazy Loading]
        Memo[Memoization]
        Cache[Caching]
        Offline[Offline First]
    end

    subgraph Impact [Impact Areas]
        Load[Load Time]
        Response[Response Time]
        Storage[Storage Usage]
        Network[Network Usage]
    end

    Lazy --> Load
    Memo --> Response
    Cache --> Storage
    Offline --> Network
```

## CI/CD Pipeline

```mermaid
graph LR
    subgraph Pipeline [CI/CD Pipeline]
        Commit[Git Commit]
        Build[Build]
        Test[Tests]
        Lint[Linting]
        Deploy[Deploy]
    end

    Commit --> Build
    Build --> Test
    Test --> Lint
    Lint --> Deploy
```

## Technology Stack

- **Frontend Framework**: React Native (Expo)
- **State Management**: Redux Toolkit
- **API Layer**: Axios
- **Database**: Supabase
- **Authentication**: Expo Auth Session
- **Styling**: React Native StyleSheet
- **Type System**: TypeScript
- **Testing**: Jest
- **CI/CD**: GitHub Actions, CircleCI
- **Code Quality**: ESLint, Prettier
- **Internationalization**: i18next

## File Structure

```
app/
├── (auth)/           # Auth related screens
├── (modal)/         # Modal screens
├── (tabs)/          # Tab navigation screens
├── components/      # Reusable components
├── constants/       # App constants
├── context/        # React Context definitions
├── hooks/          # Custom React hooks
├── models/         # Data models
├── screens/        # Screen components
├── services/       # Business logic services
├── store/          # Redux store
├── translations/   # i18n translations
└── utils/          # Utility functions
```
