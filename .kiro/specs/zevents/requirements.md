# Requirements Document

## Introduction

Zevents is a Progressive Web Application (PWA) built with Next.js for managing events such as football or cricket matches. The application supports two roles — Admin and Users. Users can register, await admin approval, browse events, and request to join them. Admin reviews join requests, confirms payment, and marks users as attendees. The app is designed for mobile-first usage as an "Add to Home Screen" PWA, deployed on Netlify with MongoDB as the data store and Material UI for the interface.

## Glossary

- **Zevents**: The application name and the system described in these requirements.
- **Admin**: A privileged user with fixed login credentials who manages users and events.
- **User**: A registered member who must be approved by Admin before accessing the application.
- **Event**: A scheduled activity (e.g., football or cricket match) created by Admin, containing a title, description, and capacity.
- **Attendee**: A User who has been confirmed by Admin as a participant for a specific Event after payment is received.
- **Join_Request**: A User's request to be marked IN for an Event, pending Admin review and payment confirmation.
- **Capacity**: The maximum number of Attendees allowed for an Event.
- **PWA**: Progressive Web Application — a web app installable on a device's home screen and usable offline or with limited connectivity.
- **MongoDB**: The NoSQL database used to persist all application data.

---

## Requirements

### Requirement 1: User Registration

**User Story:** As a visitor, I want to sign up using my name and a unique username, so that I can request access to the Zevents application.

#### Acceptance Criteria

1. THE Zevents SHALL provide a registration form with fields for full name and username.
2. WHEN a visitor submits the registration form with a username that already exists, THE Zevents SHALL reject the submission and display a message indicating the username is already taken.
3. WHEN a visitor submits the registration form with a unique username, THE Zevents SHALL create a new User account with a status of "pending approval".
4. WHILE a User account has a status of "pending approval", THE Zevents SHALL prevent the User from accessing any application features beyond the registration confirmation screen.

---

### Requirement 2: Admin Authentication

**User Story:** As an Admin, I want to log in with fixed credentials, so that I can manage users and events securely.

#### Acceptance Criteria

1. THE Zevents SHALL accept a fixed Admin username and password stored in application configuration.
2. WHEN the Admin submits valid credentials, THE Zevents SHALL grant access to the Admin dashboard.
3. WHEN the Admin submits invalid credentials, THE Zevents SHALL display an authentication error message and deny access.
4. WHILE the Admin is authenticated, THE Zevents SHALL maintain the Admin session across page navigations within the same browser session.

---

### Requirement 3: User Approval by Admin

**User Story:** As an Admin, I want to review and approve pending user registrations, so that only verified users can access the application.

#### Acceptance Criteria

1. WHEN a new User registers, THE Admin_Dashboard SHALL display the User in a pending approvals list.
2. WHEN the Admin approves a User, THE Zevents SHALL update the User's account status to "approved".
3. WHEN the Admin rejects a User, THE Zevents SHALL update the User's account status to "rejected".
4. WHILE a User's account status is "approved", THE Zevents SHALL allow that User to log in and access the application.
5. WHEN a User with status "rejected" attempts to log in, THE Zevents SHALL deny access and display an appropriate message.

---

### Requirement 4: User Authentication

**User Story:** As an approved User, I want to log in with my username, so that I can access the Zevents application.

#### Acceptance Criteria

1. THE Zevents SHALL provide a login form accepting a username.
2. WHEN an approved User submits a valid username, THE Zevents SHALL authenticate the User and redirect them to the User dashboard.
3. WHEN a User whose status is "pending approval" attempts to log in, THE Zevents SHALL deny access and display a message indicating the account is awaiting admin approval.
4. WHILE a User is authenticated, THE Zevents SHALL maintain the User session across page navigations within the same browser session.

---

### Requirement 5: Event Creation by Admin

**User Story:** As an Admin, I want to create events with a title, description, and capacity, so that Users can browse and request to join them.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL provide a form to create a new Event with fields for title, description, and capacity (maximum number of attendees).
2. WHEN the Admin submits the event creation form with all required fields, THE Zevents SHALL store the new Event in MongoDB and display it in the event list.
3. THE Zevents SHALL display all Events to Users on the User dashboard.

---

### Requirement 6: Event Management by Admin

**User Story:** As an Admin, I want to view and manage all events, so that I can keep event information current.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display a list of all Events with their title, description, capacity, and current attendee count.
2. WHEN the Admin edits an Event and submits the updated details, THE Zevents SHALL persist the changes to MongoDB and reflect them in the event list.
3. WHEN the Admin deletes an Event, THE Zevents SHALL remove the Event from MongoDB and from all event listings.

---

### Requirement 7: Join Request Submission by User

**User Story:** As an approved User, I want to mark myself as IN for an event, so that the Admin can review my request and confirm my attendance after payment.

#### Acceptance Criteria

1. THE User_Dashboard SHALL display a list of all available Events with title, description, and remaining capacity.
2. WHEN an approved User selects an Event and submits a join request, THE Zevents SHALL create a Join_Request with status "pending" and notify the Admin.
3. WHEN a User has already submitted a Join_Request for an Event with status "pending" or "confirmed", THE Zevents SHALL prevent the User from submitting a duplicate Join_Request for the same Event.
4. WHILE an Event has reached its Capacity with confirmed Attendees, THE Zevents SHALL display the Event as full and prevent new Join_Requests for that Event.

---

### Requirement 8: Join Request Review by Admin

**User Story:** As an Admin, I want to review join requests and confirm attendance after payment, so that I can manage event capacity accurately.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display all pending Join_Requests with the User's name, username, and the Event title.
2. WHEN the Admin confirms a Join_Request (indicating payment has been received), THE Zevents SHALL update the Join_Request status to "confirmed" and mark the User as an Attendee for that Event.
3. WHEN the Admin rejects a Join_Request, THE Zevents SHALL update the Join_Request status to "rejected".
4. WHEN a Join_Request is confirmed and the Event's Attendee count reaches Capacity, THE Zevents SHALL mark the Event as full and prevent further Join_Requests.

---

### Requirement 9: Attendee Visibility

**User Story:** As a User, I want to see who is attending an event, so that I know who I will be playing with.

#### Acceptance Criteria

1. WHEN a User views an Event, THE Zevents SHALL display the list of confirmed Attendees for that Event.
2. THE Zevents SHALL display the current confirmed Attendee count alongside the Event Capacity on all event listings.

---

### Requirement 10: PWA Installability and Mobile Responsiveness

**User Story:** As a User, I want to install Zevents on my mobile home screen and use it like a native app, so that I can access it quickly without a browser.

#### Acceptance Criteria

1. THE Zevents SHALL include a valid PWA manifest file with the application name "Zevents", icons, and theme colors.
2. THE Zevents SHALL register a service worker to enable "Add to Home Screen" installation on supported mobile browsers.
3. THE Zevents SHALL render all pages responsively so that the layout is usable on screens with a minimum width of 320px.
4. THE Zevents SHALL use Material UI components throughout the interface to provide a consistent, mobile-friendly design.

---

### Requirement 11: Data Persistence with MongoDB

**User Story:** As an Admin, I want all application data to be persisted in MongoDB, so that user, event, and request data is reliably stored.

#### Acceptance Criteria

1. THE Zevents SHALL connect to MongoDB using the configured connection string on application startup.
2. THE Zevents SHALL store all User records, Event records, and Join_Request records in MongoDB collections.
3. IF the MongoDB connection fails at startup, THEN THE Zevents SHALL log the error and return a 503 response to all API requests until the connection is restored.

---

### Requirement 12: Netlify Deployment Compatibility

**User Story:** As a developer, I want the application to be deployable on Netlify, so that hosting and continuous deployment are straightforward.

#### Acceptance Criteria

1. THE Zevents SHALL be structured as a Next.js application compatible with Netlify's build pipeline.
2. THE Zevents SHALL expose all backend logic through Next.js API routes so that no separate server process is required at deployment.
