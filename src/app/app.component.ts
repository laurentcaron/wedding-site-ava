import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

interface Exists {
  exists: boolean;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'wedding';
  joiningOptions = [
    {
      fr: 'J\'ai hâte d\'y être',
      id: 'yes'
    },
    {
      fr: 'Je ne pourrai pas y être',
      id: 'no'
    }
  ];

  guestList: { first: string; last: string; }[] = [];
  subscriptions: Subscription[] = [];
  errorMessage: string = '';
  shouldHideForm: boolean = false;
  shouldShowGotcha: boolean = false;
  loading: boolean = false;

  form: FormGroup = this.fb.group({
    joining: this.fb.group({}),
    restrictions: this.fb.group({})
  });

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private http: HttpClient
  ) { }

  public ngOnInit(): void {
    this.subscriptions.push(this.route.queryParams.subscribe(params => {
      if (params) {
        if (params['guests']) {
          const guests = (params['guests'] as string).split('@');
          guests.forEach(guest => {
            const fullName = guest.split('_');
            this.guestList.push({
              first: fullName[0],
              last: fullName[1]
            });
          });

          this.namesExists()
          this.guestsExists();

          for (const guest of this.guestList) {
            (this.form.get('joining') as FormGroup).addControl(guest.first, new FormControl('', Validators.required));
            (this.form.get('restrictions') as FormGroup).addControl(guest.first, new FormControl(''));
          }
        }
      }
    }));
  }

  private namesExists() {
    this.subscriptions.push(this.http.post<Exists>('https://us-central1-florencesimonwedding.cloudfunctions.net/namesExists', {
      names: this.guestList
    }).subscribe((result: Exists) => {
      if (!result.exists) {
        this.shouldShowGotcha = true;
      }
    }));
  }

  private async guestsExists() {
    this.subscriptions.push(this.http.post<Exists>('https://us-central1-florencesimonwedding.cloudfunctions.net/guestsExists', {
      guests: this.guestList
    }).subscribe((result: Exists) => {
      if (result.exists) {
        this.shouldHideForm = true;
      }
    }));
  }

  public shouldDisplayFoodSection(guest: string) {
    return (this.form.get(`joining.${guest}`) as FormControl).value === 'yes';
  }

  public addToCalendar() {
    const start = new Date(2027, 5, 27)
    const end = new Date(2027, 5, 28)
    const final_date = this.format_date(start) + "/" + this.format_date(end);
    const name = "Mariage Ava et Roman";
    const description = `Joignez-vous à nous pour notre mariage. %0A%0ALa cérémonie débute à 16:30 %0ALa Toundra https://maps.app.goo.gl/eCte9Lsek3yyQZfy7 %0A1 Circuit Gilles Villeneuve, Montreal, QC, Canada`;
    const loc = '1 Circuit Gilles Villeneuve, Montréal, QC H3C 1A9';
    const href = "https://www.google.com/calendar/render?action=TEMPLATE&text="+ name +"&dates="+ final_date +"&details="+ description +"&location="+ loc +"&sf=true&output=xml";
    window.open(href,'_blank');
  }
  
  private zero_pad2(num: number) {
    if(num < 10) return "0" + num;
      return num;
  }

  private format_date(date: Date) {
    var day = date.getDate();
    var monthIndex = date.getMonth();
    var year = date.getFullYear();
    
    let formatted_date;
    formatted_date = ("" + year) + this.zero_pad2(monthIndex) + this.zero_pad2(day);
    
    return formatted_date;
  }

  public submit() {
    if (this.form.invalid) {
      this.errorMessage = 'Veuillez compléter le formulaire';
      return;
    }

    const result: any[] = [];
    for (const guest of this.guestList) {
      result.push({
        first: guest.first,
        last: guest.last,
        joining: (this.form.get(`joining.${guest.first}`) as FormControl).value,
        restriction: (this.form.get(`restrictions.${guest.first}`) as FormControl).value
      });
    }

    try {
      this.loading = true;
      this.subscriptions.push(this.http.post('https://us-central1-florencesimonwedding.cloudfunctions.net/addGuests', {
        guests: result
      }).subscribe(() => {
        localStorage.setItem('shouldHideForm', 'true');
        this.shouldHideForm = true;
        this.loading = false;
      }));
    } catch (err) {
      console.error('An error occurred while adding the guests data', err);
      this.loading = false;
    }
  }

  public ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
