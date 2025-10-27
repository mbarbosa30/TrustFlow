import { keccak256, bytesToHex, hexToBytes } from "viem";

export class MerkleTree {
  private leaves: Uint8Array[];
  private layers: Uint8Array[][];

  constructor(leaves: Uint8Array[]) {
    this.leaves = leaves;
    this.layers = this.buildLayers(leaves);
  }

  private buildLayers(elements: Uint8Array[]): Uint8Array[][] {
    if (elements.length === 0) {
      return [];
    }

    const layers: Uint8Array[][] = [elements];
    while (layers[layers.length - 1].length > 1) {
      layers.push(this.getNextLayer(layers[layers.length - 1]));
    }

    return layers;
  }

  private getNextLayer(elements: Uint8Array[]): Uint8Array[] {
    const layer: Uint8Array[] = [];

    for (let i = 0; i < elements.length; i += 2) {
      if (i + 1 < elements.length) {
        layer.push(this.combinedHash(elements[i], elements[i + 1]));
      } else {
        layer.push(elements[i]);
      }
    }

    return layer;
  }

  private combinedHash(left: Uint8Array, right: Uint8Array): Uint8Array {
    const leftHex = bytesToHex(left);
    const rightHex = bytesToHex(right);
    const combined = `${leftHex}${rightHex.slice(2)}`;
    return hexToBytes(keccak256(combined as `0x${string}`));
  }

  getRoot(): string {
    if (this.layers.length === 0) {
      return "0x" + "0".repeat(64);
    }
    return bytesToHex(this.layers[this.layers.length - 1][0]);
  }

  getProof(leafIndex: number): string[] {
    if (leafIndex < 0 || leafIndex >= this.leaves.length) {
      throw new Error("Invalid leaf index");
    }

    const proof: string[] = [];
    let index = leafIndex;

    for (let i = 0; i < this.layers.length - 1; i++) {
      const layer = this.layers[i];
      const isRightNode = index % 2 === 1;
      const siblingIndex = isRightNode ? index - 1 : index + 1;

      if (siblingIndex < layer.length) {
        proof.push(bytesToHex(layer[siblingIndex]));
      }

      index = Math.floor(index / 2);
    }

    return proof;
  }

  static verifyProof(
    leafHash: string,
    proof: string[],
    root: string,
    leafIndex: number
  ): boolean {
    let hash = leafHash;
    let index = leafIndex;

    for (const sibling of proof) {
      const isRightNode = index % 2 === 1;

      const combined = isRightNode
        ? `${sibling}${hash.slice(2)}`
        : `${hash}${sibling.slice(2)}`;
        
      hash = keccak256(combined as `0x${string}`);

      index = Math.floor(index / 2);
    }

    return hash === root;
  }

  getConsistencyProof(oldSize: number, newSize: number): string[] {
    if (oldSize > newSize || oldSize < 1 || newSize > this.leaves.length) {
      throw new Error("Invalid tree sizes for consistency proof");
    }

    if (oldSize === newSize) {
      return [];
    }

    const proof: string[] = [];
    const oldTree = new MerkleTree(this.leaves.slice(0, oldSize));
    
    proof.push(oldTree.getRoot());
    
    for (let i = oldSize; i < newSize; i++) {
      proof.push(bytesToHex(this.leaves[i]));
    }

    return proof;
  }
}

export function computeLeafHash(data: {
  endorser: string;
  endorsee: string;
  level: number;
  epoch: bigint;
  nonce: bigint;
  sig: string;
}): string {
  const encoder = new TextEncoder();
  const endorserHex = data.endorser.slice(2);
  const endorseeHex = data.endorsee.slice(2);
  const levelHex = data.level.toString(16).padStart(2, '0');
  const epochHex = data.epoch.toString(16).padStart(16, '0');
  const nonceHex = data.nonce.toString(16).padStart(16, '0');
  const sigHex = data.sig.slice(2);

  const combined = `0x${endorserHex}${endorseeHex}${levelHex}${epochHex}${nonceHex}${sigHex}` as `0x${string}`;

  return keccak256(combined);
}
