import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Đã được JwtAuthGuard gắn vào

    if (user?.role !== 'ROLE_ADMIN') {
      throw new ForbiddenException('Chỉ ADMIN mới được thực hiện hành động này!');
    }
    return true;
  }
}