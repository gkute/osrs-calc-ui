import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TitleCasePipe } from '@angular/common';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, TitleCasePipe],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  readonly skills = [
    'agility', 'construction', 'cooking', 'crafting', 'farming',
    'firemaking', 'fishing', 'fletching', 'herblore', 'hunter',
    'magic', 'mining', 'prayer', 'runecrafting', 'sailing',
    'smithing', 'thieving', 'woodcutting',
  ];
}
