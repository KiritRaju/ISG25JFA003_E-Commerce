import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CategoryService } from '../../../core/services/category.service';
import { CategoryRequestDTO, CategoryResponseDTO } from '../../../core/models/category';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './category-form.component.html',
  styleUrls: ['./category-form.component.scss']
})
export class CategoryFormComponent implements OnInit {
  categoryForm!: FormGroup;
  isEditMode = false;
  categoryId: number | null = null;
  submitted = false;

  constructor(
    private fb: FormBuilder,
    private categoryService: CategoryService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.categoryId = Number(id);
        this.loadCategory(this.categoryId);
      }
    });
  }

  initializeForm(): void {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(200)]],
      imageUrl: ['', [Validators.pattern(/^https?:\/\/.+/)]]
    });
  }

  // Getter for easy access to form controls
  get f() { return this.categoryForm.controls; }

  loadCategory(id: number): void {
    this.categoryService.getCategoryById(id).subscribe((data: CategoryResponseDTO) => {
      this.categoryForm.patchValue({
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl || ''
      });
    });
  }

  onSubmit(): void {
    this.submitted = true;

    // Stop if form is invalid
    if (this.categoryForm.invalid) {
      return;
    }

    const categoryData: CategoryRequestDTO = this.categoryForm.value;

    if (this.isEditMode && this.categoryId) {
      this.categoryService.updateCategory(this.categoryId, categoryData).subscribe(() => {
        this.router.navigate(['/admin/categories']);
      });
    } else {
      this.categoryService.createCategory(categoryData).subscribe(() => {
        this.router.navigate(['/admin/categories']);
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/admin/categories']);
  }
}


