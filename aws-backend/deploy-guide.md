# Deploy Guide: Tech Debugging AWS Backend

## Prerequisites
- AWS Account with credits
- AWS CLI configured (`aws configure`)
- AWS SAM CLI installed ([Install guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html))

## Option 1: Deploy with SAM CLI (Recommended)

```bash
# Navigate to the backend folder
cd aws-backend

# Build the SAM application
sam build

# Deploy (first time — guided)
sam deploy --guided
```

When prompted:
- **Stack Name**: `tech-debug-api`
- **Region**: Choose your preferred region (e.g., `ap-south-1` for India)
- **Confirm changes**: Yes
- **Allow SAM CLI IAM role creation**: Yes
- **Save arguments**: Yes

After deployment, copy the **API URL** from the outputs:
```
Outputs:
  ApiUrl: https://xxxxxxxx.execute-api.ap-south-1.amazonaws.com/prod
```

Then update your `.env.local`:
```
NEXT_PUBLIC_API_URL=https://xxxxxxxx.execute-api.ap-south-1.amazonaws.com/prod
```

## Option 2: Manual AWS Console Setup

If you prefer not to install SAM CLI, follow these steps:

### Step 1: Create DynamoDB Tables
1. Go to **DynamoDB** → **Create table**
2. Create 4 tables:

| Table Name | Partition Key | Type |
|------------|--------------|------|
| `TechDebug_Participants` | `id` | String |
| `TechDebug_Questions` | `id` | String |
| `TechDebug_Settings` | `configKey` | String |
| `TechDebug_Metadata` | `metaKey` | String |

- Use **On-demand** capacity mode for all tables

### Step 2: Create Lambda Function
1. Go to **Lambda** → **Create function**
2. Name: `TechDebugAPI`
3. Runtime: **Node.js 20.x**
4. Architecture: **x86_64**
5. Click **Create function**
6. In the Code tab, replace `index.mjs` with the content from `aws-backend/index.mjs`
7. Go to **Configuration** → **Environment variables** and add:
   - `PARTICIPANTS_TABLE` = `TechDebug_Participants`
   - `QUESTIONS_TABLE` = `TechDebug_Questions`
   - `SETTINGS_TABLE` = `TechDebug_Settings`
   - `METADATA_TABLE` = `TechDebug_Metadata`
8. Go to **Configuration** → **General** → Set timeout to **30 seconds**
9. Go to **Configuration** → **Permissions** → Click the **Role name**
10. In IAM, attach the policy **AmazonDynamoDBFullAccess** to the role

### Step 3: Create API Gateway
1. Go to **API Gateway** → **Create API** → **HTTP API** → **Build**
2. Name: `TechDebugAPI`
3. Add **Lambda integration** → select `TechDebugAPI` function
4. Add routes:

| Method | Path |
|--------|------|
| GET | `/settings/{key}` |
| PUT | `/settings/{key}` |
| POST | `/participants` |
| GET | `/participants` |
| PUT | `/participants/{id}` |
| DELETE | `/participants` |
| GET | `/questions` |
| POST | `/questions` |
| PUT | `/questions/{id}` |
| DELETE | `/questions/{id}` |
| POST | `/questions/batch` |
| GET | `/metadata/{key}` |
| PUT | `/metadata/{key}` |

5. All routes should integrate with the `TechDebugAPI` Lambda
6. **CORS**: Under the API settings → CORS:
   - Allow Origins: `*`
   - Allow Methods: `GET, POST, PUT, DELETE, OPTIONS`
   - Allow Headers: `Content-Type`
7. Deploy to stage `prod`
8. Copy the **Invoke URL** and update `.env.local`

## Testing Your API

After deployment, test with curl:

```bash
# Test settings
curl https://YOUR_API_URL/prod/settings/config

# Test creating a participant
curl -X POST https://YOUR_API_URL/prod/participants \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","studentId":"S001","section":"Python","startedAt":1234567890}'

# Test getting questions
curl https://YOUR_API_URL/prod/questions
```

## Cost Estimate
- **DynamoDB**: ~$0.25/month (on-demand, low volume)
- **Lambda**: Free tier covers 1M requests/month
- **API Gateway**: Free tier covers 1M requests/month
- **Total**: Effectively **free** within your $120 credit
