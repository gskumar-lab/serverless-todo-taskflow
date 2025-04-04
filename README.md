# Task Manager Web App

A modern task management application built with serverless AWS services.

![App Screenshot](/images/dashboard.png)

## Features

- User authentication with AWS Cognito
- Create, read, update, and delete tasks
- Task status tracking (Pending/Completed)
- Due date management with visual indicators
- Task statistics and progress tracking
- Bulk operations
- Responsive design for all devices
- Light/dark theme support

## Technologies Used

**Frontend**:
- HTML5, CSS3, JavaScript
- AWS Amplify for hosting
- Font Awesome for icons
- AWS SDK for JavaScript

**Backend**:
- AWS Lambda (Python)
- Amazon DynamoDB
- Amazon API Gateway
- Amazon Cognito

## Setup Instructions

### Prerequisites
- AWS account
- Git

### Deployment Steps

1. **Backend Setup**:
   - Create DynamoDB table with `id` as partition key and `user_id` as sort key
   - Set up Cognito User Pool with the required configuration
   - Deploy Lambda function with appropriate IAM permissions
   - Configure API Gateway with Cognito authorizer

2. **Frontend Setup**:
   - Update `app.js` with your Cognito and API Gateway endpoints
   - Deploy using AWS Amplify or any static hosting service

3. **Environment Variables**:
   Configure the following in your frontend:
   - Cognito User Pool ID
   - Cognito Client ID
   - API Gateway endpoint

## Configuration

Update these values in `app.js`:

```javascript
const apiUrl = 'YOUR_API_GATEWAY_ENDPOINT/prod/tasks';
const cognitoConfig = {
    region: 'YOUR_REGION',
    userPoolId: 'YOUR_USER_POOL_ID',
    clientId: 'YOUR_CLIENT_ID'
};