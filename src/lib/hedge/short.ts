import Decimal from "decimal.js";
import { HedgeTranche } from "@/types";

export class ShortTrancheManager {
  private tranches: HedgeTranche[] = [];
  private idCounter = 0;

  constructor(initialTranches: HedgeTranche[] = []) {
    this.tranches = [...initialTranches];
    if (initialTranches.length > 0) {
      this.idCounter = initialTranches.length;
    }
  }

  public getTranches(): HedgeTranche[] {
    return this.tranches;
  }

  public getTotalNotional(): Decimal {
    return this.tranches.reduce((sum, t) => sum.plus(t.notional), new Decimal(0));
  }

  /**
   * Adds a new short tranche (Increase short)
   */
  public addTranche(notional: Decimal, entryPrice: Decimal, stepIndex: number) {
    if (notional.lte(0)) return;
    this.idCounter++;
    this.tranches.push({
      id: `tranche-${this.idCounter}`,
      entryPrice,
      notional,
      openedAtStep: stepIndex
    });
  }

  /**
   * Reduces the short position using FIFO accounting.
   * Returns the realized PnL from the closed portions.
   */
  public reduceTranche(amountToClose: Decimal, currentPrice: Decimal): Decimal {
    if (amountToClose.lte(0)) return new Decimal(0);

    let remainingToClose = amountToClose;
    let realizedPnL = new Decimal(0);

    // FIFO processing
    while (remainingToClose.gt(0) && this.tranches.length > 0) {
      const oldest = this.tranches[0];

      if (oldest.notional.lte(remainingToClose)) {
        // Fully close this tranche
        const pnl = oldest.notional.mul(oldest.entryPrice.minus(currentPrice)).div(oldest.entryPrice);
        realizedPnL = realizedPnL.plus(pnl);

        remainingToClose = remainingToClose.minus(oldest.notional);
        this.tranches.shift(); // Remove the oldest
      } else {
        // Partially close this tranche
        const pnl = remainingToClose.mul(oldest.entryPrice.minus(currentPrice)).div(oldest.entryPrice);
        realizedPnL = realizedPnL.plus(pnl);

        oldest.notional = oldest.notional.minus(remainingToClose);
        remainingToClose = new Decimal(0);
      }
    }

    return realizedPnL;
  }

  /**
   * Calculates current unrealized PnL of all open tranches.
   */
  public getUnrealizedPnL(currentPrice: Decimal): Decimal {
    return this.tranches.reduce((sum, t) => {
      const pnl = t.notional.mul(t.entryPrice.minus(currentPrice)).div(t.entryPrice);
      return sum.plus(pnl);
    }, new Decimal(0));
  }
}
