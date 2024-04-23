import browser from 'webextension-polyfill'
import {render} from 'react-dom'
import {getPublicKey} from 'nostr-tools/pure'
import * as nip19 from 'nostr-tools/nip19'
import React, {useState, useRef, useEffect} from 'react'
import QRCode from 'react-qr-code'

function Popup() {
  let [prvKey, setPrvKey] = useState('')
  let [pubKey, setPubKey] = useState('')

  let keys = useRef([])

  useEffect(() => {
    browser.storage.local.get(['private_key', 'relays']).then(results => {
      if (results.private_key) {
        setPrvKey(results.private_key)

        if (results.private_key.startsWith('ncryptsec')) {
          return false
        }

        let hexKey = getPublicKey(results.private_key)
        let npubKey = nip19.npubEncode(hexKey)

        setPubKey(npubKey)

        keys.current.push(npubKey)
        keys.current.push(hexKey)

        if (results.relays) {
          let relaysList = []
          for (let url in results.relays) {
            if (results.relays[url].write) {
              relaysList.push(url)
              if (relaysList.length >= 3) break
            }
          }
          if (relaysList.length) {
            let nprofileKey = nip19.nprofileEncode({
              pubkey: hexKey,
              relays: relaysList
            })
            keys.current.push(nprofileKey)
          }
        }
      } else {
        setPubKey(null)
      }
    })
  }, [])

  return (
    <div style={{marginBottom: '5px'}}>
      <h2>nos2x</h2>
      {pubKey === null ? (
        <div>
          <button onClick={openOptionsButton}>start here</button>
        </div>
      ) : prvKey.startsWith('ncryptsec') ? (
        <p>your private key is encryted. use the options page to decrypt.</p>
      ) : (
        <>
          <p>
            <a onClick={toggleKeyType}>↩️</a> your public key:
          </p>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              width: '200px'
            }}
          >
            <code>{pubKey}</code>
          </pre>

          <div
            style={{
              height: 'auto',
              // margin: '0 auto',
              maxWidth: 256,
              width: '100%'
            }}
          >
            <QRCode
              size={256}
              style={{height: 'auto', maxWidth: '100%', width: '100%'}}
              value={pubKey.startsWith('n') ? pubKey.toUpperCase() : pubKey}
              viewBox={`0 0 256 256`}
            />
          </div>
        </>
      )}
    </div>
  )

  async function openOptionsButton() {
    if (browser.runtime.openOptionsPage) {
      browser.runtime.openOptionsPage()
    } else {
      window.open(browser.runtime.getURL('options.html'))
    }
  }

  function toggleKeyType(e) {
    e.preventDefault()
    let nextKeyType =
      keys.current[(keys.current.indexOf(pubKey) + 1) % keys.current.length]
    setPubKey(nextKeyType)
  }
}

render(<Popup />, document.getElementById('main'))
