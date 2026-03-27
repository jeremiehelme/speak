import { v4 as uuidv4 } from 'uuid';
import { SettingsService } from './settings-service.js';

export class BookmarkletService {
  constructor(private settings: SettingsService) {}

  async ensureApiToken(): Promise<string> {
    let token = await this.settings.get('api_token');
    if (!token) {
      token = uuidv4();
      await this.settings.set('api_token', token);
    }
    return token;
  }

  async generateBookmarkletCode(): Promise<string> {
    const token = await this.ensureApiToken();
    const appUrl =
      (await this.settings.get('app_url')) || process.env['APP_URL'] || 'http://localhost:3000';

    // The bookmarklet opens a small popup with the current page URL pre-filled
    /* eslint-disable no-useless-escape -- <\/script> escape prevents browser from closing script tag early */
    const code = `javascript:void(function(){
      var w=window.open('','speak_capture','width=420,height=350,scrollbars=no');
      w.document.write('<html><head><title>Speak Capture</title><style>body{font-family:system-ui;margin:20px;background:#f9fafb}h3{margin:0 0 12px;color:#111}textarea{width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:6px;padding:8px;font-family:system-ui;font-size:14px;resize:vertical}button{margin-top:12px;padding:8px 16px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px}button:hover{background:#1d4ed8}.status{margin-top:8px;font-size:13px;color:#6b7280}</style></head><body><h3>Speak Capture</h3><p style="font-size:13px;color:#6b7280;margin:0 0 12px">'+document.title+'</p><textarea id="t" rows="3" placeholder="What\\'s your take? (optional)"></textarea><button onclick="send()">Capture</button><div class="status" id="s"></div><script>function send(){var s=document.getElementById("s");s.textContent="Capturing...";fetch("${appUrl}/api/capture?token=${token}",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:"'+encodeURIComponent(location.href)+'",opinion:document.getElementById("t").value})}).then(function(r){if(!r.ok)throw new Error(r.status);s.textContent="Captured!";s.style.color="#16a34a";setTimeout(function(){window.close()},2000)}).catch(function(e){s.textContent="Error: "+e.message;s.style.color="#dc2626"})}<\/script></body></html>');
    }())`.replace(/\n\s+/g, '');
    /* eslint-enable no-useless-escape */

    return code;
  }
}
