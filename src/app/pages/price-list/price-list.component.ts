import { Component, OnInit } from '@angular/core';
import { MaterialService } from '../../services/material.service';
import { Material } from '../../models/interfaces';

@Component({
  selector: 'app-price-list',
  templateUrl: './price-list.component.html',
  styleUrls: ['./price-list.component.css']
})
export class PriceListComponent implements OnInit {
  materials: Material[] = [];
  isLoading = true;

  constructor(private materialService: MaterialService) {}

  ngOnInit() {
    this.loadMaterials();
  }

  loadMaterials() {
    this.isLoading = true;
    this.materialService.getMaterials({ limit: 100 }).subscribe({
      next: (res) => {
        if (res.success) {
          this.materials = res.data;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }
}
