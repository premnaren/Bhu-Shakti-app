# **App Name**: DataGrid Firebase

## Core Features:

- Firebase Initialization: Initialize Firebase with configurations (__firebase_config) and app ID (__app_id). This also handles user authentication using custom tokens or anonymous sign-in, displaying the userId on the UI for debugging.
- Firestore Integration: Use onSnapshot() to listen for real-time data updates from the Firestore collection (artifacts/{__app_id}/users/{userId}/data). Automatically update the UI upon data changes.
- CRUD Operations: Enable users to create, read, and delete data. Data input is done using forms and saved as new documents via addDoc(). Data is read and displayed in a list, with a delete button next to each entry to remove documents using deleteDoc(). Includes error handling with try...catch.
- Data Visualization: Uses AI to interpret and classify different pieces of data, assigning to each a style that visually enhances meaning. The LLM reasons as a tool whether it is beneficial to assign a certain piece of styling to certain data or not.
- Tailwind CSS Styling: Applies Tailwind CSS classes for styling to ensure a modern and responsive design. It incorporates rounded corners and subtle shadows on interactive elements.
- Loading State: Implements a loading spinner to indicate app initialization and authentication processes, improving user experience during setup.
- Custom Message Boxes: Replaces standard alert() messages with custom, user-friendly message boxes for displaying success or error notifications (e.g., 'Data added successfully!'). Also integrates a custom modal for confirmation messages before deletion, ensuring non-obtrusive feedback.

## Style Guidelines:

- Primary color: Deep blue (#3F51B5) for a sense of security and reliability.
- Background color: Very light blue (#F0F4FF) for a clean and calm interface.
- Accent color: Purple (#7E57C2) for highlighting interactive elements and key data.
- Body and headline font: 'Inter', a sans-serif font that offers a modern, neutral look suitable for both headlines and body text.
- Use minimalist icons to represent actions and data types, ensuring clarity and ease of use.
- Use a grid-based layout with sufficient white space to improve readability and content prioritization.
- Use subtle fade-in animations for data updates and modal transitions to provide a smooth user experience.