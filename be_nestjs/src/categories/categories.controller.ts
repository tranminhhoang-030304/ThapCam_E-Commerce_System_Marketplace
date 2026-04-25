import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Inject, UseInterceptors, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { Cache } from 'cache-manager';
import { CacheInterceptor, CACHE_MANAGER } from '@nestjs/cache-manager';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService, @Inject(CACHE_MANAGER) private cacheManager: Cache,) {}

  // PUBLIC: Khách hàng được xem danh mục để lướt sản phẩm
  @UseInterceptors(CacheInterceptor)
  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @UseInterceptors(CacheInterceptor)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  // PRIVATE: Chỉ Admin mới được Thêm/Sửa/Xóa danh mục
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  async create(@Body() createCategoryDto: any) {
    await this.cacheManager.clear()
    return this.categoriesService.create(createCategoryDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateCategoryDto: any) {
    await this.cacheManager.clear()
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.cacheManager.clear()
    return this.categoriesService.remove(id);
  }
}