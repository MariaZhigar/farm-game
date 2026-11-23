import type { Game, HudModel } from '../game/Game';
import type { AnimalId, ProductId } from '../game/types';
import { PRODUCTS } from '../game/config/products';

const base = import.meta.env.BASE_URL;

function coinMarkup(size: number): string {
  const webp = `${base}assets/coin-128.webp 1x, ${base}assets/coin.webp 2x`;
  const png1 = `${base}assets/coin-128.png`;
  const png2 = `${base}assets/coin.png`;
  return `<picture><source type="image/webp" srcset="${webp}" /><img class="coin-icon" src="${png1}" srcset="${png1} 1x, ${png2} 2x" alt="" width="${size}" height="${size}" /></picture>`;
}

const ICONS: Record<AnimalId, string> = {
  chicken: `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="28" cy="40" rx="16" ry="12" fill="#fffaf3" stroke="#3b2614" stroke-width="2"/>
      <circle cx="42" cy="30" r="9" fill="#fffaf3" stroke="#3b2614" stroke-width="2"/>
      <circle cx="40" cy="20" r="3" fill="#e23b3b"/>
      <circle cx="45" cy="19" r="3.2" fill="#e23b3b"/>
      <path d="M48 30 L58 33 L48 36 Z" fill="#f0a03a"/>
      <circle cx="44" cy="29" r="1.4" fill="#3b2614"/>
    </svg>`,
  cow: `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect x="10" y="28" width="36" height="20" rx="8" fill="#f7f7f4" stroke="#3b2614" stroke-width="2"/>
      <ellipse cx="48" cy="32" rx="10" ry="8" fill="#f7f7f4" stroke="#3b2614" stroke-width="2"/>
      <path d="M40 26 L38 16 L44 26 M50 26 L56 16 L52 26" fill="#f4d27a" stroke="#3b2614" stroke-width="1"/>
      <circle cx="18" cy="34" r="3" fill="#3b2614"/>
      <circle cx="30" cy="40" r="3" fill="#3b2614"/>
    </svg>`,
};

export class Hud {
  private warehouseHtml = '';
  private shopHtml = '';
  private shopNoteHtml = '';
  private toastHtml = '';
  private completeKey = '';
  private resetArmedAt = 0;

  constructor(private readonly game: Game) {
    this.byId('sell').addEventListener('click', () => this.game.sell());
    this.byId('scoop').addEventListener('click', () => this.game.scoop());
    this.byId('shop-open').addEventListener('click', () => {
      if (this.game.view().completed) return;
      this.openShop(true);
    });
    this.byId('shop-close').addEventListener('click', () => this.openShop(false));
    this.byId('shop').addEventListener('click', (event) => {
      if (event.target === event.currentTarget) this.openShop(false);
    });
    this.byId('shop-list').addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest('button[data-buy]');
      if (!button) return;
      const id = button.getAttribute('data-buy');
      if (id === 'chicken' || id === 'cow') this.game.buy(id);
    });
    this.byId('complete-next').addEventListener('click', () => this.game.nextLevel());
    this.byId('reset').addEventListener('click', () => this.onReset());
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') this.openShop(false);
    });
  }

  sync(): void {
    const view = this.game.view();
    this.byId('level-kicker').textContent = `Уровень ${view.levelIndex + 1} из ${view.levelCount}`;
    this.byId('level-title').textContent = view.title;
    this.byId('hint').textContent = view.hint;
    const goal = this.byId('goal-text');
    this.byId('goal-label').textContent = `${view.goalText}: ${view.progress}/${view.target}`;
    this.byId('goal-coin').hidden = view.goalKind !== 'earn';
    goal.dataset.progress = String(view.progress);
    goal.dataset.target = String(view.target);
    this.byId('goal-bar').style.width = `${view.target ? Math.min(100, (view.progress / view.target) * 100) : 0}%`;
    const coins = this.byId('coins');
    this.byId('coins-value').textContent = String(view.coins);
    coins.dataset.coins = String(view.coins);
    this.byId('bucket-label').textContent = `${Math.floor(view.bucket)}/${view.bucketMax}`;
    this.byId('bucket-bar').style.width = `${Math.min(100, (view.bucket / view.bucketMax) * 100)}%`;
    this.byId('well-label').textContent = `${Math.floor(view.well)}/${view.wellMax}`;
    this.byId('well-bar').style.width = `${Math.min(100, (view.well / view.wellMax) * 100)}%`;
    this.paintWarehouse(view);
    this.paintShop(view);
    this.paintComplete(view);
    const toast = this.byId('toast');
    const text = escapeHtml(view.message);
    const toastHtml = view.messageOn && view.messageCoin ? `${coinMarkup(18)}${text}` : text;
    if (toastHtml !== this.toastHtml) {
      this.toastHtml = toastHtml;
      toast.innerHTML = toastHtml;
    }
    toast.classList.toggle('show', view.messageOn);
  }

  private paintWarehouse(view: HudModel): void {
    const root = this.byId('warehouse');
    root.dataset.count = String(view.warehouse.length);
    root.dataset.capacity = String(view.capacity);
    const slots = Array.from({ length: view.capacity }, (_, index) => view.warehouse[index] ?? null);
    const html = `
      <div class="wh-head">Склад ${view.warehouse.length}/${view.capacity}</div>
      <div class="slots">${slots.map((product) => slotMarkup(product)).join('')}</div>
    `;
    if (html === this.warehouseHtml) return;
    this.warehouseHtml = html;
    root.innerHTML = html;
  }

  private paintShop(view: HudModel): void {
    const note = `На поле ${view.animalCount} из ${view.maxAnimals}. Монет: ${coinMarkup(16)} ${view.coins}.`;
    if (note !== this.shopNoteHtml) {
      this.shopNoteHtml = note;
      this.byId('shop-note').innerHTML = note;
    }
    const html = view.shop
      .map((offer) => {
        const reason = offer.reason ? ` aria-label="${escapeHtml(offer.reason)}, ${offer.price} монет"` : '';
        return `
          <article class="offer">
            <div class="offer-icon">${ICONS[offer.id]}</div>
            <div class="offer-copy">
              <h3>${escapeHtml(offer.name)}</h3>
              <p>${escapeHtml(offer.blurb)}</p>
            </div>
            <button type="button" class="price" data-buy="${offer.id}" ${offer.reason ? 'disabled' : ''}${reason}>${coinMarkup(18)}<span>${offer.price}</span></button>
          </article>
        `;
      })
      .join('');
    if (html === this.shopHtml) return;
    this.shopHtml = html;
    this.byId('shop-list').innerHTML = html;
  }

  private paintComplete(view: HudModel): void {
    const overlay = this.byId('complete');
    const wasHidden = overlay.classList.contains('hidden');
    overlay.classList.toggle('hidden', !view.completed);
    if (view.completed) this.byId('shop').classList.add('hidden');
    const key = `${view.completed}|${view.lastLevel}|${view.goalText}|${view.coins}`;
    if (key === this.completeKey) return;
    this.completeKey = key;
    this.byId('complete-title').textContent = view.lastLevel ? 'Все уровни пройдены!' : 'Уровень пройден!';
    const goalName = escapeHtml(view.goalText);
    const purse = `<span class="complete-coins">${coinMarkup(18)} ${view.coins}</span>`;
    this.byId('complete-text').innerHTML = view.lastLevel
      ? `Цель «${goalName}» выполнена. Можно начать сначала: монеты и уровни сбросятся. Сейчас ${purse}.`
      : `Цель «${goalName}» выполнена. Монет на руках: ${purse}. Они перейдут на следующий уровень.`;
    this.byId('complete-next').textContent = view.lastLevel ? 'Играть сначала' : 'Следующий уровень';
    if (view.completed && wasHidden) this.byId('complete-next').focus();
  }

  private openShop(open: boolean): void {
    this.byId('shop').classList.toggle('hidden', !open);
    if (open) this.byId('shop-close').focus();
  }

  private onReset(): void {
    const now = performance.now();
    if (now - this.resetArmedAt < 2500) {
      this.resetArmedAt = 0;
      this.openShop(false);
      this.game.newGame();
      return;
    }
    this.resetArmedAt = now;
    this.game.toast('Нажмите «Заново» ещё раз, чтобы начать сначала');
  }

  private byId(id: string): HTMLElement {
    const node = document.getElementById(id);
    if (!node) throw new Error(`Не найден элемент #${id}`);
    return node;
  }
}

function slotMarkup(product: ProductId | null): string {
  if (!product) return '<div class="slot"></div>';
  return `<div class="slot filled ${product}"><span class="sr">${escapeHtml(PRODUCTS[product].name)}</span></div>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[char] ?? char;
  });
}
