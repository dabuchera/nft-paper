import { useAuth } from './use-auth'
import { Storage } from '@stacks/storage'
import { IPrivateFile, IPublicFile, PrivateMetadataFile, PublicMetadataFile } from '@/types/storage'
import { useState } from 'react'
import useLoading from './use-loading'
import { useToast } from '@chakra-ui/react'
import { AppConfig, UserSession } from '@stacks/connect'

const PRIVATE_METADATA_FILE_PATH = '.vaultacks/metadata.json'
const PUBLIC_METADATA_FILE_PATH = 'https://json-server-brown.vercel.app/profile'

export const useStorage = () => {
  const { userSession, userData } = useAuth()
  const [metadata, setMetadata] = useState<PrivateMetadataFile | undefined>()
  const [publicMetadata, setPublicMetadata] = useState<PublicMetadataFile | undefined>()

  const {
    isLoading: isMetadataRefreshing,
    startLoading: startMetadataRefreshingLoading,
    stopLoading: stopMetadataRefreshingLoading,
  } = useLoading()
  const toast = useToast()

  const storage = new Storage({ userSession })

  const refreshMetadata = async () => {
    startMetadataRefreshingLoading()
    try {
      const res = await getMetadataFile()
      setMetadata(res)

      const resOverview = await getOverviewFile()
      console.log(resOverview)

      console.log(storage)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Error fetching files',
        description: 'Something went wrong when fetching the files. Please try again later',
        status: 'error',
      })
    }
    stopMetadataRefreshingLoading()
  }

  const saveFile = async (path: string, data: any, isPublic: boolean = false, isString: boolean = true) => {
    const existingMetadata = await getMetadataFile()

    const existingOverviewMetadata = await getOverviewFile()
    console.log(existingOverviewMetadata)

    const url = await storage.putFile(path, data, {
      encrypt: !isPublic,
      cipherTextEncoding: 'base64',
      dangerouslyIgnoreEtag: true,
      wasString: isString,
    })

    const currentFileMetadata: IPrivateFile = {
      path,
      isPublic,
      lastModified: new Date().toISOString(),
      url,
      isString,
    }

    // Private Metadata
    if (existingMetadata) {
      const newMetadata: PrivateMetadataFile = existingMetadata
      if (existingMetadata.files) {
        newMetadata.files = {
          ...existingMetadata.files,
          [path]: currentFileMetadata,
        }
      }

      await saveMetadataFile(newMetadata)
    } else {
      await saveMetadataFile({
        files: { [path]: currentFileMetadata },
      })
    }

    const userAddress = userData?.profile.stxAddress.testnet

    const currentPublicMetadata: IPublicFile = {
      userAddress,
      path,
      isPublic,
      lastModified: new Date().toISOString(),
      url,
      isString,
    }

    // Public Metadata -> Overview of all files
    // if (existingOverviewdata) {
    if (existingOverviewMetadata) {
      const newMetadata: PublicMetadataFile = existingOverviewMetadata
      if (existingOverviewMetadata.files) {
        newMetadata.files = {
          ...existingOverviewMetadata.files,
          [path]: currentPublicMetadata,
        }
      }
      await saveOverviewFile(newMetadata)
    } else {
      await saveOverviewFile({
        files: { [path]: currentPublicMetadata },
      })
    }

    await refreshMetadata()

    return url
  }

  const getFileWithMeta = async (filename: string) => {
    const fileMeta = await getFileMetadata(filename)
    const res = await storage.getFile(filename, {
      decrypt: !fileMeta.isPublic,
    })

    return { meta: fileMeta, data: res }
  }

  const getFile = async (filename: string, doDecrypt: boolean = true) => {
    const res = await storage.getFile(filename, {
      decrypt: doDecrypt,
    })

    return res
  }

  const getMetadataFile = async () => {
    console.log('getMetadataFile')
    try {
      const metadata = await storage.getFile(PRIVATE_METADATA_FILE_PATH, {
        decrypt: true,
      })
      if (!metadata) return null
      console.log(JSON.parse(metadata as string))
      return JSON.parse(metadata as string)
    } catch (err) {
      console.error(err)
    }
  }

  const getOverviewFile = async () => {
    console.log('getOverviewFile')
    try {
      return await fetch(PUBLIC_METADATA_FILE_PATH)
        .then((response) => response.json())
        .then((data) => {
          // return data -> Ohne encryption
          return userSession
            .decryptContent(JSON.stringify(data), {
              privateKey: '4e185081062dd819e0f251864817957704f17bb07baef49fa447bbbeb8b143e5',
            })
            .then((res) => {
              if (!res) return null
              return JSON.parse(res as string)
            })
        })
    } catch (err) {
      console.error(err)
    }
  }

  const getFileMetadata = async (path: string) => {
    const metadata = await getMetadataFile()
    if (!metadata) return null
    return metadata.files[path]
  }

  const saveMetadataFile = async (metadata: any) => {
    await storage.putFile(PRIVATE_METADATA_FILE_PATH, JSON.stringify(metadata), {
      encrypt: true,
      dangerouslyIgnoreEtag: true,
      wasString: true,
    })
  }

  // eth2022
  // 5T1jdvsjEGWBQU4a

  // Store Overview File
  const saveOverviewFile = async (metadata: any) => {
    console.log('saveOverviewFile')
    console.log(JSON.stringify(metadata))
    const encrypted = await userSession.encryptContent(JSON.stringify(metadata), {
      privateKey: '4e185081062dd819e0f251864817957704f17bb07baef49fa447bbbeb8b143e5',
    })

    console.log(encrypted)

    try {
      return await fetch(PUBLIC_METADATA_FILE_PATH, {
        method: 'PUT',
        headers: {
          'Content-type': 'application/json',
        },
        // body: JSON.stringify(metadata),
        body: encrypted,
      })
        .then((response) => {
          response.json()
        })
        .then((data) => {
          console.log('Success:', data)
        })
    } catch (err) {
      console.error(err)
    }

    // await put(
    //   'https://gaia.blockstack.org/hub/13gZ22jqAdNxK8EZRFK6goFdVYM1ZuVjgn/' + PUBLIC_METADATA_FILE_PATH,
    //   JSON.stringify(metadata),
    //   {
    //     encrypt:
    //       '047bb0899a921f69345ae4fa9d309c3ab65ae22b67fc019ee048764f4ca323ee3001f6585470f0dbc82b9f844a67c1a7780393230c0cca93b1214a59c223a2efdc',
    //     dangerouslyIgnoreEtag: true,
    //     wasString: true,
    //   }
    // )
  }

  const deleteFile = async (path: string) => {
    const existingMetadata = await getMetadataFile()

    const newMetadata: PrivateMetadataFile = {
      ...existingMetadata,
      files: { ...existingMetadata.files, [path]: undefined },
    }

    await saveMetadataFile(newMetadata)

    await storage.deleteFile(path)

    await refreshMetadata()
  }

  const deleteAllFiles = async () => {
    const paths: string[] = []
    await storage.listFiles((path) => {
      paths.push(path)
      return true
    })

    for (const path of paths) {
      await storage.deleteFile(path)
      console.log(`delete ${path}`)
    }
  }

  const deletePublicFile = async () => {
    try {
      return await fetch(PUBLIC_METADATA_FILE_PATH, {
        method: 'PUT',
        headers: {
          'Content-type': 'application/json',
        },
        // body: JSON.stringify(metadata),
        body: '',
      }).then((response) => {
        console.log('response: ' + JSON.stringify(response))
        return response.json()
      })
    } catch (err) {
      console.error(err)
    }
  }

  const test = () => {
    console.log(publicMetadata)
  }

  return {
    storage,
    saveFile,
    getFile,
    getFileWithMeta,
    getMetadataFile,
    getFileMetadata,
    saveMetadataFile,
    deleteFile,
    deleteAllFiles,
    deletePublicFile,
    metadata,
    refreshMetadata,
    isMetadataRefreshing,
    test,
  }
}
