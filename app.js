const $=s=>document.querySelector(s);
const views=['#captureView','#loadingView','#resultView'];
const KEYWORDS={
'haste':'This creature can attack and use tap abilities on the turn it enters. Normally a creature must wait until your next turn.',
'vigilance':'Attacking does not tap this creature, so it can still block on the next turn.',
'flying':'This creature can only be blocked by creatures with flying or reach.',
'reach':'This creature can block creatures with flying, even though it does not fly itself.',
'deathtouch':'Any amount of combat damage this deals to a creature is enough to destroy that creature.',
'lifelink':'Damage dealt by this source also makes you gain that much life.',
'first strike':'This creature deals combat damage before creatures without first strike.',
'double strike':'This creature deals combat damage twice: once during first-strike damage and once during normal damage.',
'trample':'After assigning lethal damage to blockers, the rest can hit the defending player, battle or planeswalker.',
'hexproof':'Your opponents cannot target this permanent with their spells or abilities. You still can.',
'shroud':'No player can target this permanent, including you.',
'menace':'This creature cannot be blocked by just one creature. It needs at least two blockers.',
'indestructible':'Damage and effects that say “destroy” do not destroy it. It can still be sacrificed, exiled, returned to hand, or get 0 toughness.',
'flash':'You can cast this whenever you could cast an instant, including during an opponent’s turn.',
'defender':'This creature cannot attack, though it can still block.',
'ward':'If an opponent targets it, they must pay the ward cost or that spell or ability is countered.',
'protection':'Protection prevents certain damage, enchanting/equipping, blocking and targeting from the stated quality.',
'prowess':'Whenever you cast a noncreature spell, this creature gets +1/+1 until end of turn.',
'equip':'Pay the equip cost at sorcery speed to attach this Equipment to a creature you control.',
'crew':'Tap creatures you control with total power at least equal to the crew number to turn this Vehicle into a creature for the turn.',
'scry':'Look at that many cards from the top of your library. Put any on the bottom and the rest back on top in any order.',
'surveil':'Look at that many cards from the top of your library. Put any into your graveyard and the rest back on top in any order.',
'escape':'You may cast this card from your graveyard by paying its escape cost and exiling the listed number of other cards.',
'kicker':'You may pay the extra kicker cost as you cast the spell for the additional effect described.',
'cycling':'Pay the cycling cost and discard this card to draw a card. This is an activated ability, not casting the card.',
'flashback':'You may cast this card from your graveyard for its flashback cost. Then exile it.',
'mutate':'You may cast it for its mutate cost onto a non-Human creature you own. The pile keeps the abilities of every card in it.',
'cascade':'When you cast this spell, exile cards from your library until you find a cheaper nonland card, which you may cast for free.',
'delve':'Each card you exile from your graveyard while casting this spell pays for one generic mana.',
'convoke':'Your creatures can help cast this spell. Tapping one pays for one generic mana or one mana of that creature’s colour.',
'affinity':'This spell costs one less generic mana for each permanent you control of the stated kind.',
'annihilator':'When this creature attacks, the defending player sacrifices the stated number of permanents.',
'domain':'The effect scales with the number of basic land types among lands you control, from zero to five.',
'landfall':'This ability triggers whenever a land enters the battlefield under your control.',
'mill':'Put the stated number of cards from the top of a library into its owner’s graveyard.',
'exile':'Move the card to the exile zone. Exiled cards normally cannot be used unless an effect specifically says they can.',
'sacrifice':'Its controller puts it into the graveyard. Sacrificing is not the same as destroying.',
'counter target':'Stop the targeted spell or ability before it resolves. A countered spell usually goes to its owner’s graveyard.'
};
let chosenName='', currentCard=null, photoURL='', timer;
function showView(id){views.forEach(v=>$(v).classList.toggle('active',v===id));window.scrollTo({top:0,behavior:'smooth'})}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
function beginNameStep(){ $('#identifyPanel').hidden=false; $('#skipPhotoBtn').hidden=true; setTimeout(()=>$('#cardName').focus(),150)}
$('#cameraInput').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;if(photoURL)URL.revokeObjectURL(photoURL);photoURL=URL.createObjectURL(f);$('#photoPreview').src=photoURL;$('#photoPreview').hidden=false;$('#emptyState').hidden=true;$('#cameraLabel').textContent='Photo taken';beginNameStep()});
$('#skipPhotoBtn').onclick=beginNameStep;
$('#cardName').addEventListener('input',e=>{chosenName=e.target.value.trim();$('#explainBtn').disabled=chosenName.length<2;clearTimeout(timer);if(chosenName.length<2){$('#suggestions').innerHTML='';return}timer=setTimeout(()=>suggest(chosenName),220)});
async function suggest(q){try{const r=await fetch('https://api.scryfall.com/cards/autocomplete?q='+encodeURIComponent(q));const j=await r.json();$('#suggestions').innerHTML=(j.data||[]).slice(0,6).map(n=>`<button class="suggestion" role="option" data-name="${esc(n)}">${esc(n)}</button>`).join('')}catch(e){$('#suggestions').innerHTML=''}}
$('#suggestions').onclick=e=>{const b=e.target.closest('[data-name]');if(!b)return;chosenName=b.dataset.name;$('#cardName').value=chosenName;$('#suggestions').innerHTML='';$('#explainBtn').disabled=false};
$('#clearSearch').onclick=()=>{$('#cardName').value='';chosenName='';$('#suggestions').innerHTML='';$('#explainBtn').disabled=true;$('#cardName').focus()};
$('#explainBtn').onclick=lookup;
async function lookup(){showView('#loadingView');try{const r=await fetch('https://api.scryfall.com/cards/named?fuzzy='+encodeURIComponent(chosenName));const card=await r.json();if(!r.ok)throw new Error(card.details||'Card not found');currentCard=card;render(card);saveHistory(card);setTimeout(()=>showView('#resultView'),420)}catch(e){showView('#captureView');toast('Could not find that card. Try the full name.')}}
function faces(card){return card.card_faces?.length?card.card_faces:[card]}
function fullOracle(card){return faces(card).map(f=>f.oracle_text||'').filter(Boolean).join('\n—\n')}
function image(card){return card.image_uris?.normal||card.card_faces?.[0]?.image_uris?.normal||''}
function detected(text){const low=text.toLowerCase();return Object.entries(KEYWORDS).filter(([k])=>low.includes(k)).map(([k,v])=>({k,v}))}
function primaryRole(card,text){const type=card.type_line.toLowerCase();if(type.includes('instant'))return 'a reactive spell you can use at almost any time';if(type.includes('sorcery'))return 'a one-shot effect you normally cast during your own main phase';if(type.includes('creature'))return 'a creature that can attack, block, and create ongoing pressure';if(type.includes('enchantment'))return 'an ongoing effect that stays in play until removed';if(type.includes('artifact'))return 'a permanent that stays in play and provides an ongoing tool or effect';if(type.includes('planeswalker'))return 'a planeswalker that builds value through loyalty abilities and can be attacked';if(type.includes('land'))return 'a land that supports your mana or gives you an extra utility effect';return 'a permanent or spell that changes the game while its text applies'}
function timing(card,text){const t=card.type_line.toLowerCase(),low=text.toLowerCase();if(t.includes('instant')||low.includes('flash'))return 'Hold it until the moment its effect matters. Because it works at instant speed, waiting keeps your options open and gives opponents less information.';if(t.includes('sorcery'))return 'Cast it in one of your main phases when the board and targets make the effect worthwhile. You cannot normally use it during combat or on an opponent’s turn.';if(t.includes('creature'))return low.includes('haste')?'Play it when immediate pressure matters. Haste means it can attack or use tap abilities straight away.':'Play it in a main phase when you can afford to develop your board. Unless it has haste, it cannot attack or use abilities with the tap symbol until your next turn.';if(t.includes('land'))return 'Play it during one of your main phases while the stack is empty. Remember that playing a land is not casting a spell.';return 'Most permanents are best played in your main phase, when you can pay for them without giving up a more urgent response.'}
function useWell(card,text){const low=text.toLowerCase(),ideas=[];if(low.includes('draw'))ideas.push('Use the card draw when you have room in hand and time to benefit from the extra options.');if(low.includes('destroy')||low.includes('exile target'))ideas.push('Save the removal for a threat that matters, rather than automatically using it on the first legal target.');if(low.includes('whenever')||low.includes('at the beginning'))ideas.push('This card rewards you for keeping it in play long enough to trigger repeatedly.');if(low.includes('sacrifice'))ideas.push('Look for permanents that already gave you value or benefit from going to the graveyard.');if(low.includes('graveyard'))ideas.push('Treat your graveyard as a resource and plan what you want to put there or bring back.');if(low.includes('counter target'))ideas.push('Keep the required mana available and prioritise spells that would be difficult to answer after they resolve.');if(card.type_line.toLowerCase().includes('equipment'))ideas.push('Develop a creature first, then attach this when you can still afford the equip cost.');if(!ideas.length)ideas.push('Read the card as a job, not just an effect: decide whether it develops your board, protects something, removes a threat, or helps you finish the game.');return ideas}
function watchOut(card,text){const low=text.toLowerCase(),items=[];if(low.includes('target'))items.push('A target must still be legal when the ability or spell resolves. If every target becomes illegal, it does nothing.');if(low.includes('until end of turn'))items.push('The effect is temporary and wears off during the cleanup step.');if(low.includes('sacrifice'))items.push('You cannot sacrifice something you do not control, and a sacrificed permanent is not “destroyed”.');if(low.includes('once each turn'))items.push('It can trigger only once each turn, but potentially once on every player’s turn.');if(card.type_line.toLowerCase().includes('aura'))items.push('If its target disappears while the Aura spell is on the stack, the Aura will not enter attached.');if(!items.length)items.push('Do not commit it automatically. Consider what removal, blockers, or responses your opponent may still have.');return items}
function summary(card,text){const role=primaryRole(card,text);const first=text.split('\n').find(Boolean)||'';return `${card.name} is ${role}. ${plain(first)}`}
function plain(s){return s.replace(/\([^)]*\)/g,'').replace(/\{[^}]+\}/g,'mana').replace(/•/g,'').replace(/\s+/g,' ').trim()}
function render(card){const text=fullOracle(card),keys=detected(text),img=image(card);$('#resultContent').innerHTML=`
<div class="card-hero">${img?`<img src="${img}" alt="${esc(card.name)} card image">`:''}<div><span class="type-chip">${esc(card.rarity||'card')}</span><h1>${esc(card.name)}</h1><p>${esc(card.type_line)}</p></div></div>
<div class="summary">${esc(summary(card,text))}</div>
${section(1,'What it does',`<p>${esc(primaryRole(card,text)[0].toUpperCase()+primaryRole(card,text).slice(1))}.</p><p class="oracle">${esc(text||'No Oracle text is available for this card.')}</p>`)}
${section(2,'Words worth knowing',keys.length?`<div class="keyword-grid">${keys.map(x=>`<div class="keyword"><strong>${esc(x.k)}</strong><span>${esc(x.v)}</span></div>`).join('')}</div>`:'<p>This card has no major keyword that needs translating. Its Oracle text says exactly what happens.</p>')}
${section(3,'When to play it',`<p>${esc(timing(card,text))}</p>`)}
${section(4,'How to use it well',`<ul>${useWell(card,text).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`)}
${section(5,'Watch out for',`<ul>${watchOut(card,text).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`)}`}
function section(n,title,body){return `<section class="explain-section"><div class="section-title"><b>${n}</b><h2>${title}</h2></div>${body}</section>`}
function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function reset(){currentCard=null;chosenName='';$('#cardName').value='';$('#suggestions').innerHTML='';$('#explainBtn').disabled=true;showView('#captureView')}
function retake(){reset();$('#cameraInput').value='';if(photoURL)URL.revokeObjectURL(photoURL);photoURL='';$('#photoPreview').hidden=true;$('#emptyState').hidden=false;$('#cameraLabel').textContent='Open camera';$('#identifyPanel').hidden=true;$('#skipPhotoBtn').hidden=false;setTimeout(()=>$('#cameraInput').click(),150)}
$('#retakeBtn').onclick=retake;$('#wrongBtn').onclick=retake;$('#anotherBtn').onclick=reset;$('#backBtn').onclick=reset;
$('#shareBtn').onclick=async()=>{if(!currentCard)return;const data={title:`${currentCard.name} — SpellCheck`,text:`I used SpellCheck to understand ${currentCard.name}.`,url:location.href};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(location.href);toast('Link copied')}}catch(e){}}
function saveHistory(c){const h=JSON.parse(localStorage.getItem('spellcheck-history')||'[]').filter(x=>x.id!==c.id);h.unshift({id:c.id,name:c.name,type:c.type_line,img:image(c)});localStorage.setItem('spellcheck-history',JSON.stringify(h.slice(0,8)))}
$('#historyBtn').onclick=()=>{const h=JSON.parse(localStorage.getItem('spellcheck-history')||'[]');$('#historyList').innerHTML=h.length?h.map(x=>`<button class="history-item" data-history="${esc(x.name)}">${x.img?`<img src="${x.img}" alt="">`:''}<div><strong>${esc(x.name)}</strong><span>${esc(x.type)}</span></div></button>`).join(''):'<p class="hint">No cards explained yet.</p>';$('#historyDialog').showModal()};
$('#closeHistory').onclick=()=>$('#historyDialog').close();$('#historyList').onclick=e=>{const b=e.target.closest('[data-history]');if(!b)return;chosenName=b.dataset.history;$('#historyDialog').close();lookup()};
