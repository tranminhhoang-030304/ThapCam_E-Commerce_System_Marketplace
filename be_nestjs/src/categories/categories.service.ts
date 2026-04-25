import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: Partial<Category>): Promise<Category> {
    const newCategory = this.categoriesRepository.create(createCategoryDto);
    return this.categoriesRepository.save(newCategory);
  }

  async findAll(): Promise<Category[]> {
    return this.categoriesRepository.find({
      relations: ['products'],
    });
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({ where: { id }, relations: ['products'] });
    if (!category) throw new NotFoundException(`Không tìm thấy danh mục id ${id}`);
    return category;
  }

  async update(id: string, updateCategoryDto: any): Promise<Category> {
    const category = await this.findOne(id);
    
    // Bảo vệ khóa chính, không cho phép update id
    if (updateCategoryDto.id) delete updateCategoryDto.id;
    
    Object.assign(category, updateCategoryDto);
    return this.categoriesRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    await this.categoriesRepository.remove(category);
  }
}