import { Injectable } from '@angular/core'
import { getDatabase, ref, push } from 'firebase/database'
import { app } from '../../firebase.config'

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {

  private db = getDatabase(app)

  sendBox(reportId: string, defect: boolean) {
    const reportRef = ref(this.db, reportId)

    return push(reportRef, {
      defect: defect
    })
  }
}
