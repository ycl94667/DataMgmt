import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { PrismaService } from '../prisma.service';

interface ActionMapping {
  method: string;
  pattern: RegExp;
  action: string;
  targetType: string;
}

const ACTION_MAPPINGS: ActionMapping[] = [
  { method: 'POST', pattern: /\/api\/admin\/projects/, action: 'PROJECT_CREATE', targetType: 'project' },
  { method: 'PUT', pattern: /\/api\/admin\/projects/, action: 'PROJECT_UPDATE', targetType: 'project' },
  { method: 'DELETE', pattern: /\/api\/admin\/projects/, action: 'PROJECT_DELETE', targetType: 'project' },
  { method: 'POST', pattern: /\/api\/admin\/documents/, action: 'DOCUMENT_CREATE', targetType: 'document' },
  { method: 'PUT', pattern: /\/api\/admin\/documents/, action: 'DOCUMENT_UPDATE', targetType: 'document' },
  { method: 'DELETE', pattern: /\/api\/admin\/documents/, action: 'DOCUMENT_DELETE', targetType: 'document' },
  { method: 'POST', pattern: /\/api\/admin\/categories/, action: 'CATEGORY_CREATE', targetType: 'category' },
  { method: 'PUT', pattern: /\/api\/admin\/categories/, action: 'CATEGORY_UPDATE', targetType: 'category' },
  { method: 'DELETE', pattern: /\/api\/admin\/categories/, action: 'CATEGORY_DELETE', targetType: 'category' },
  { method: 'POST', pattern: /\/api\/admin\/regions/, action: 'REGION_CREATE', targetType: 'region' },
  { method: 'PUT', pattern: /\/api\/admin\/regions/, action: 'REGION_UPDATE', targetType: 'region' },
  { method: 'DELETE', pattern: /\/api\/admin\/regions/, action: 'REGION_DELETE', targetType: 'region' },
  { method: 'POST', pattern: /\/api\/admin\/videos/, action: 'VIDEO_CREATE', targetType: 'video' },
  { method: 'PUT', pattern: /\/api\/admin\/videos/, action: 'VIDEO_UPDATE', targetType: 'video' },
  { method: 'DELETE', pattern: /\/api\/admin\/videos/, action: 'VIDEO_DELETE', targetType: 'video' },
  { method: 'POST', pattern: /\/api\/admin\/tags/, action: 'TAG_CREATE', targetType: 'tag' },
  { method: 'PUT', pattern: /\/api\/admin\/tags/, action: 'TAG_UPDATE', targetType: 'tag' },
  { method: 'DELETE', pattern: /\/api\/admin\/tags/, action: 'TAG_DELETE', targetType: 'tag' },
  { method: 'POST', pattern: /\/api\/admin\/batches/, action: 'BATCH_CREATE', targetType: 'batch' },
  { method: 'PUT', pattern: /\/api\/admin\/batches/, action: 'BATCH_UPDATE', targetType: 'batch' },
  { method: 'DELETE', pattern: /\/api\/admin\/batches/, action: 'BATCH_DELETE', targetType: 'batch' },
  { method: 'POST', pattern: /\/api\/admin\/auth-codes/, action: 'AUTH_CODE_CREATE', targetType: 'auth_code' },
  { method: 'PUT', pattern: /\/api\/admin\/auth-codes/, action: 'AUTH_CODE_UPDATE', targetType: 'auth_code' },
  { method: 'DELETE', pattern: /\/api\/admin\/auth-codes/, action: 'AUTH_CODE_DELETE', targetType: 'auth_code' },
  { method: 'POST', pattern: /\/api\/admin\/admins/, action: 'ADMIN_CREATE', targetType: 'admin' },
  { method: 'PUT', pattern: /\/api\/admin\/admins/, action: 'ADMIN_UPDATE', targetType: 'admin' },
  { method: 'DELETE', pattern: /\/api\/admin\/admins/, action: 'ADMIN_DELETE', targetType: 'admin' },
];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, path } = request;

    // Only audit POST, PUT, DELETE on admin endpoints
    if (!['POST', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    if (!path.includes('/api/admin')) {
      return next.handle();
    }

    const mapping = ACTION_MAPPINGS.find(
      (m) => m.method === method && m.pattern.test(path),
    );

    if (!mapping) {
      return next.handle();
    }

    const user = (request as any).user;

    return next.handle().pipe(
      tap({
        next: (responseData) => {
          // Extract target id from path params or response
          const idMatch = path.match(/\/(\d+)(?:\/|$)/);
          const targetId = idMatch ? BigInt(idMatch[1]) : null;

          const targetName =
            responseData?.name || responseData?.data?.name || null;

          this.prisma.auditLog
            .create({
              data: {
                operatorId: user?.id ? BigInt(user.id) : null,
                operatorName: user?.realName || user?.username || null,
                action: mapping.action,
                targetType: mapping.targetType,
                targetId,
                targetName,
                detail: {
                  method,
                  path,
                  body: request.body,
                } as any,
                ipAddress:
                  (request.headers['x-forwarded-for'] as string) ||
                  request.ip ||
                  null,
              },
            })
            .catch((err) => {
              // Audit log failure should not break the request
              console.error('Failed to write audit log:', err);
            });
        },
      }),
    );
  }
}
