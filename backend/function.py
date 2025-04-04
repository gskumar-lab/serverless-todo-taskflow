import json
import boto3
from datetime import datetime
import uuid
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Tasks')

def get_user_id(event):
    return event['requestContext']['authorizer']['claims']['sub']

def lambda_handler(event, context):
    try:
        user_id = get_user_id(event)
        http_method = event['httpMethod']
        path = event['path']
        
        cors_headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization'
        }

        if http_method == 'GET' and path == '/tasks':
            response = table.query(
                IndexName='user_id-index',
                KeyConditionExpression=Key('user_id').eq(user_id)
            )
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps(response['Items'])
            }

        elif http_method == 'POST' and path == '/tasks':
            task_data = json.loads(event['body'])
            task_id = str(uuid.uuid4())
            
            item = {
                'id': task_id,
                'user_id': user_id,
                'title': task_data['title'],
                'description': task_data['description'],
                'task_status': 'Pending',
                'due_date': task_data['due_date'],
                'created_at': datetime.now().isoformat()
            }
            
            table.put_item(Item=item)
            return {
                'statusCode': 201,
                'headers': cors_headers,
                'body': json.dumps(item)
            }

        elif http_method == 'PUT' and path.startswith('/tasks/'):
            task_id = path.split('/')[-1]
            update_data = json.loads(event['body'])
            
            response = table.update_item(
                Key={'id': task_id, 'user_id': user_id},
                UpdateExpression='SET task_status = :ts',
                ExpressionAttributeValues={':ts': update_data['task_status']},
                ReturnValues='ALL_NEW'
            )
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps(response.get('Attributes', {}))
            }

        elif http_method == 'DELETE' and path.startswith('/tasks/'):
            task_id = path.split('/')[-1]
            table.delete_item(Key={'id': task_id, 'user_id': user_id})
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({'message': 'Task deleted'})
            }

        return {
            'statusCode': 404,
            'headers': cors_headers,
            'body': json.dumps({'message': 'Not Found'})
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({'error': str(e)})
        }