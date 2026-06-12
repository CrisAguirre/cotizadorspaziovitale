import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-activity',
  templateUrl: './activity.component.html',
  styleUrls: ['./activity.component.css']
})
export class ActivityComponent implements OnInit {
  activities: any[] = [];
  isLoading: boolean = true;

  constructor(private authService: AuthService) { }

  ngOnInit(): void {
    this.loadActivities();
  }

  loadActivities(): void {
    this.authService.getActivities().subscribe({
      next: (res: any) => {
        if (res.success) {
          this.activities = res.data;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching activities:', err);
        this.isLoading = false;
      }
    });
  }
}
