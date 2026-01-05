window.hasApplylyListener||(window.hasApplylyListener=!0,chrome.runtime.onMessage.addListener((e,o,t)=>{if(e.type==="FILL_FORM"){const n=c(e.data);t({count:n})}return!0}));function c(e){let o=0;return h().forEach(n=>{if(!d(n))return;const i=p(n),s=f(i,e);s&&(n.tagName==="SELECT"?u(n,s):n.value=s,n.dispatchEvent(new Event("input",{bubbles:!0})),n.dispatchEvent(new Event("change",{bubbles:!0})),n.dispatchEvent(new Event("blur",{bubbles:!0})),y(n),o++)}),o>0&&m(o),o}function d(e){const o=window.getComputedStyle(e);return o.display!=="none"&&o.visibility!=="hidden"&&o.opacity!=="0"&&e.offsetWidth>0&&e.offsetHeight>0}function p(e){const o=[];if(e.id){const s=document.querySelector(`label[for="${e.id}"]`);s&&o.push(s.textContent||"")}const t=e.closest("label");t&&o.push(t.textContent||""),[e.getAttribute("aria-label"),e.getAttribute("aria-labelledby"),e.getAttribute("placeholder"),e.getAttribute("name"),e.id].forEach(s=>{s&&o.push(s)});const i=e.parentElement;if(i){const s=i.textContent||"";s.length<100&&o.push(s)}return o.join(" ").toLowerCase()}function f(e,o){const t=o.personalInfo,n=[[["first name","given name","fname"],t.firstName],[["last name","family name","surname","lname"],t.lastName],[["email","e-mail"],t.email],[["phone","mobile","cell","tel"],t.phone],[["linkedin"],t.linkedin],[["website","portfolio","portfolio site","site"],t.website],[["github"],t.github],[["address","street","location"],t.address],[["city"],t.address.split(",")[0]||""]];for(const[i,s]of n)if(i.some(l=>e.includes(l)))return s;if(o.workExperience.length>0){const i=o.workExperience[0],s=[[["employer","company","organization"],i.company],[["job title","position","role"],i.title],[["responsibilities","work description"],i.description]];for(const[l,r]of s)if(l.some(a=>e.includes(a)))return r}if(o.education.length>0){const i=o.education[0],s=[[["school","university","college","institution"],i.school],[["degree","qualification"],i.degree],[["field of study","major","program"],i.field],[["gpa","grade","average"],i.gpa||""]];for(const[l,r]of s)if(l.some(a=>e.includes(a)))return r}return e.includes("skill")||e.includes("competencies")?o.skills.join(", "):null}function u(e,o){const t=o.toLowerCase(),n=Array.from(e.options);let i=n.find(s=>s.text.toLowerCase()===t||s.value.toLowerCase()===t);i||(i=n.find(s=>s.text.toLowerCase().includes(t)||t.includes(s.text.toLowerCase()))),i&&(e.value=i.value)}function y(e){const o=e.style.border,t=e.style.boxShadow;e.style.border="2px solid #FF8C42",e.style.boxShadow="0 0 8px rgba(255, 140, 66, 0.4)",setTimeout(()=>{e.style.border=o,e.style.boxShadow=t},2e3)}function m(e){var i;const o=document.getElementById("applyly-overlay");o&&o.remove();const t=document.createElement("div");t.id="applyly-overlay",t.style.cssText=`
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #1a1d21;
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        z-index: 1000000;
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: -apple-system, system-ui, sans-serif;
        border: 1px solid rgba(255, 140, 66, 0.3);
        animation: applyly-slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    `;const n=document.createElement("style");n.textContent=`
        @keyframes applyly-slide-in {
            from { transform: translateX(100%) opacity: 0; }
            to { transform: translateX(0) opacity: 1; }
        }
    `,document.head.appendChild(n),t.innerHTML=`
        <div style="width: 24px; height: 24px; background: #FF8C42; border-radius: 6px; display: flex; align-items: center; justify-content: center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <div>
            <div style="font-weight: 600; font-size: 14px;">Applyly™</div>
            <div style="font-size: 12px; opacity: 0.8;">Filled ${e} fields correctly</div>
        </div>
        <button id="applyly-close" style="background: none; border: none; color: white; opacity: 0.5; padding: 4px; cursor: pointer; font-size: 20px; margin-left: 8px;">&times;</button>
    `,document.body.appendChild(t),(i=document.getElementById("applyly-close"))==null||i.addEventListener("click",()=>t.remove()),setTimeout(()=>{t.style.transform="translateX(120%)",t.style.opacity="0",t.style.transition="all 0.5s ease",setTimeout(()=>t.remove(),500)},4e3)}function h(){const e=[],o=t=>{let n;if(t instanceof HTMLIFrameElement)try{n=t.contentDocument||void 0}catch{}else n=t;if(!n)return;const i=Array.from(n.querySelectorAll("input, textarea, select"));e.push(...i),n.querySelectorAll("*").forEach(l=>{l.shadowRoot&&o(l.shadowRoot),l.tagName==="IFRAME"&&o(l)})};return o(document),e}
